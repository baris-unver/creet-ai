import json
import logging
import os
import tempfile
import uuid
from datetime import datetime, timezone

import ffmpeg
import redis
from sqlalchemy import select

from app.config import get_settings
from app.database import SyncSessionLocal
from app.models.asset import GeneratedAsset, AssetType
from app.models.export import Export, ExportStatus
from app.models.project import Project, VIDEO_FORMAT_SPECS
from app.models.scene import Scene
from app.services.storage import download_file, upload_file
from app.tasks.celery_app import celery

logger = logging.getLogger(__name__)


def _get_redis():
    settings = get_settings()
    return redis.from_url(settings.REDIS_URL)


def _publish(project_id: str, progress: int, message: str = "", status: str = "running"):
    r = _get_redis()
    r.publish(f"project:{project_id}", json.dumps({
        "type": "progress",
        "project_id": project_id,
        "stage": "assembly",
        "progress": progress,
        "message": message,
        "status": status,
    }))


@celery.task(bind=True, name="app.tasks.assembly.assemble_video")
def assemble_video(self, export_id: str, project_id: str, team_id: str):
    db = SyncSessionLocal()
    tmpdir = tempfile.mkdtemp()
    try:
        export = db.execute(select(Export).where(Export.id == export_id)).scalar_one_or_none()
        if not export:
            return

        export.status = ExportStatus.PROCESSING
        db.commit()

        project = db.execute(select(Project).where(Project.id == project_id)).scalar_one_or_none()
        if not project:
            export.status = ExportStatus.FAILED
            db.commit()
            return

        format_spec = VIDEO_FORMAT_SPECS[export.format]
        width = format_spec["width"]
        height = format_spec["height"]

        _publish(project_id, 10, "Loading scenes...")

        scenes = db.execute(
            select(Scene).where(Scene.project_id == project_id).order_by(Scene.scene_number)
        ).scalars().all()

        scene_files = []
        for i, scene in enumerate(scenes):
            image_asset = db.execute(
                select(GeneratedAsset).where(
                    GeneratedAsset.scene_id == scene.id,
                    GeneratedAsset.asset_type == AssetType.IMAGE,
                )
            ).scalar_one_or_none()

            audio_asset = db.execute(
                select(GeneratedAsset).where(
                    GeneratedAsset.scene_id == scene.id,
                    GeneratedAsset.asset_type == AssetType.AUDIO,
                )
            ).scalar_one_or_none()

            img_path = None
            if image_asset and image_asset.storage_path:
                img_data = download_file(image_asset.storage_path)
                img_path = os.path.join(tmpdir, f"scene_{i}.png")
                with open(img_path, "wb") as f:
                    f.write(img_data)

            audio_path = None
            if audio_asset and audio_asset.storage_path:
                audio_data = download_file(audio_asset.storage_path)
                audio_path = os.path.join(tmpdir, f"scene_{i}.mp3")
                with open(audio_path, "wb") as f:
                    f.write(audio_data)

            duration = scene.duration_seconds or 5.0
            scene_files.append({
                "image": img_path,
                "audio": audio_path,
                "duration": duration,
                "number": scene.scene_number,
            })

            _publish(project_id, 10 + int(20 * (i + 1) / len(scenes)), f"Loaded scene {i + 1}/{len(scenes)}")

        if not scene_files:
            export.status = ExportStatus.FAILED
            db.commit()
            _publish(project_id, 0, "No scenes to assemble", "failed")
            return

        _publish(project_id, 40, "Assembling scene clips...")

        clip_paths = []
        for i, sf in enumerate(scene_files):
            clip_path = os.path.join(tmpdir, f"clip_{i}.mp4")
            try:
                _create_scene_clip(sf, clip_path, width, height)
                clip_paths.append(clip_path)
            except Exception as e:
                logger.exception(f"Failed to create clip for scene {sf['number']}: {e}")

            _publish(project_id, 40 + int(30 * (i + 1) / len(scene_files)), f"Assembled clip {i + 1}/{len(scene_files)}")

        if not clip_paths:
            export.status = ExportStatus.FAILED
            db.commit()
            _publish(project_id, 0, "Failed to create any clips", "failed")
            return

        _publish(project_id, 75, "Concatenating clips...")

        concat_file = os.path.join(tmpdir, "concat.txt")
        with open(concat_file, "w") as f:
            for cp in clip_paths:
                f.write(f"file '{cp}'\n")

        output_path = os.path.join(tmpdir, "output.mp4")
        try:
            (
                ffmpeg
                .input(concat_file, format="concat", safe=0)
                .output(output_path, vcodec="libx264", acodec="aac", pix_fmt="yuv420p",
                        movflags="+faststart", preset="medium", crf=23)
                .overwrite_output()
                .run(quiet=True)
            )
        except ffmpeg.Error as e:
            logger.exception(f"FFmpeg concat failed: {e}")
            export.status = ExportStatus.FAILED
            db.commit()
            _publish(project_id, 0, "FFmpeg assembly failed", "failed")
            return

        _publish(project_id, 90, "Uploading final video...")

        with open(output_path, "rb") as f:
            video_data = f.read()

        storage_path = f"{team_id}/{project_id}/exports/{export.format.value}.mp4"
        upload_file(storage_path, video_data, "video/mp4")

        export.storage_path = storage_path
        export.status = ExportStatus.COMPLETED
        export.file_size_bytes = len(video_data)
        export.completed_at = datetime.now(timezone.utc)

        total_duration = sum(sf["duration"] for sf in scene_files)
        export.duration_seconds = total_duration
        db.commit()

        _publish(project_id, 100, "Video assembly complete!", "completed")

    except Exception as e:
        logger.exception(f"Assembly failed: {e}")
        try:
            export.status = ExportStatus.FAILED
            db.commit()
        except Exception:
            pass
        _publish(project_id, 0, str(e), "failed")
    finally:
        db.close()
        import shutil
        shutil.rmtree(tmpdir, ignore_errors=True)


def _create_scene_clip(scene_file: dict, output_path: str, width: int, height: int):
    duration = scene_file["duration"]

    if scene_file["image"] and scene_file["audio"]:
        video_in = ffmpeg.input(scene_file["image"], loop=1, t=duration, framerate=30)
        audio_in = ffmpeg.input(scene_file["audio"])
        (
            ffmpeg
            .output(
                video_in.video, audio_in.audio, output_path,
                vcodec="libx264", acodec="aac",
                pix_fmt="yuv420p",
                vf=f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
                shortest=None,
                t=duration,
            )
            .overwrite_output()
            .run(quiet=True)
        )
    elif scene_file["image"]:
        video_in = ffmpeg.input(scene_file["image"], loop=1, t=duration, framerate=30)
        (
            ffmpeg
            .output(
                video_in, output_path,
                vcodec="libx264", acodec="aac",
                pix_fmt="yuv420p",
                vf=f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
                t=duration,
            )
            .overwrite_output()
            .run(quiet=True)
        )
