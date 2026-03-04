import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Semaphore

import redis
from sqlalchemy import select

from app.config import get_settings
from app.database import SyncSessionLocal
from app.models.asset import GeneratedAsset, AssetType
from app.models.project import Project, VIDEO_FORMAT_SPECS
from app.models.scene import Scene, StageStatus
from app.models.character import Character
from app.models.scene import SceneCharacter
from app.providers.registry import get_image_provider_for_team, get_tts_provider_for_team
from app.services.storage import upload_file
from app.tasks.celery_app import celery

logger = logging.getLogger(__name__)
API_SEMAPHORE = Semaphore(3)


def _get_redis():
    settings = get_settings()
    return redis.from_url(settings.REDIS_URL)


def _publish(project_id: str, stage: str, progress: int, message: str = "", status: str = "running"):
    r = _get_redis()
    r.publish(f"project:{project_id}", json.dumps({
        "type": "progress",
        "project_id": project_id,
        "stage": stage,
        "progress": progress,
        "message": message,
        "status": status,
    }))


@celery.task(bind=True, name="app.tasks.media.generate_scene_media")
def generate_scene_media(self, project_id: str, team_id: str):
    db = SyncSessionLocal()
    try:
        project = db.execute(
            select(Project).where(Project.id == project_id)
        ).scalar_one_or_none()
        if not project:
            return

        scenes = db.execute(
            select(Scene).where(Scene.project_id == project_id).order_by(Scene.scene_number)
        ).scalars().all()

        if not scenes:
            return

        format_spec = VIDEO_FORMAT_SPECS[project.format]
        total = len(scenes) * 2
        completed = 0

        _publish(project_id, "media_generation", 0, "Starting media generation...")

        image_provider = get_image_provider_for_team(db, team_id)
        tts_provider = get_tts_provider_for_team(db, team_id)

        def generate_image(scene: Scene):
            with API_SEMAPHORE:
                prompt = _build_image_prompt(db, scene)
                img_bytes = image_provider.generate_sync(
                    prompt,
                    format_spec["width"],
                    format_spec["height"],
                )
                path = f"{team_id}/{project_id}/scenes/scene_{scene.scene_number}_image.png"
                upload_file(path, img_bytes, "image/png")
                return scene.id, AssetType.IMAGE, path, len(img_bytes)

        def generate_tts(scene: Scene):
            if not scene.voiceover_text:
                return None
            with API_SEMAPHORE:
                audio_bytes = tts_provider.generate_sync(scene.voiceover_text)
                path = f"{team_id}/{project_id}/scenes/scene_{scene.scene_number}_audio.mp3"
                upload_file(path, audio_bytes, "audio/mpeg")
                return scene.id, AssetType.AUDIO, path, len(audio_bytes)

        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = []
            for scene in scenes:
                futures.append(executor.submit(generate_image, scene))
                futures.append(executor.submit(generate_tts, scene))

            for future in as_completed(futures):
                try:
                    result = future.result()
                    if result is None:
                        completed += 1
                        continue
                    scene_id, asset_type, path, size = result
                    asset = GeneratedAsset(
                        project_id=project_id,
                        scene_id=scene_id,
                        asset_type=asset_type,
                        storage_path=path,
                        status=StageStatus.AWAITING_APPROVAL,
                        metadata_={"file_size": size},
                        provider_used=image_provider.__class__.__name__ if asset_type == AssetType.IMAGE else tts_provider.__class__.__name__,
                    )
                    db.add(asset)
                    db.commit()
                    completed += 1
                    progress = int(completed / total * 100)
                    _publish(project_id, "media_generation", progress, f"Generated {completed}/{total} assets")
                except Exception as e:
                    completed += 1
                    logger.exception(f"Failed to generate asset: {e}")

        state = dict(project.pipeline_state)
        state["media_generation"] = "awaiting_approval"
        project.pipeline_state = state
        db.commit()

        _publish(project_id, "media_generation", 100, "Media generation complete", "completed")

    finally:
        db.close()


def _build_image_prompt(db, scene: Scene) -> str:
    parts = []

    chars = db.execute(
        select(Character)
        .join(SceneCharacter, SceneCharacter.character_id == Character.id)
        .where(SceneCharacter.scene_id == scene.id)
    ).scalars().all()

    for char in chars:
        if char.canonical_prompt:
            parts.append(char.canonical_prompt)

    if scene.image_prompt:
        parts.append(scene.image_prompt)

    return ". ".join(parts) if parts else f"A scene depicting: {scene.description or scene.title}"


@celery.task(name="app.tasks.media.generate_subtitles")
def generate_subtitles(project_id: str, team_id: str):
    db = SyncSessionLocal()
    try:
        scenes = db.execute(
            select(Scene).where(Scene.project_id == project_id).order_by(Scene.scene_number)
        ).scalars().all()

        srt_lines = []
        current_time = 0.0

        for i, scene in enumerate(scenes, 1):
            if not scene.voiceover_text:
                continue
            duration = scene.duration_seconds or 5.0
            start = _format_srt_time(current_time)
            end = _format_srt_time(current_time + duration)
            srt_lines.append(f"{i}")
            srt_lines.append(f"{start} --> {end}")
            srt_lines.append(scene.voiceover_text)
            srt_lines.append("")
            current_time += duration

        srt_content = "\n".join(srt_lines)
        path = f"{team_id}/{project_id}/subtitles.srt"
        upload_file(path, srt_content.encode("utf-8"), "text/srt")

        asset = GeneratedAsset(
            project_id=project_id,
            scene_id=scenes[0].id if scenes else None,
            asset_type=AssetType.SUBTITLE,
            storage_path=path,
            status=StageStatus.APPROVED,
        )
        db.add(asset)
        db.commit()

    finally:
        db.close()


def _format_srt_time(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
