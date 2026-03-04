import json
import logging
from typing import Callable

from sqlalchemy.orm import Session
from sqlalchemy import select

from app.config import get_settings
from app.models.project import Project, PipelineStage, DURATION_TIER_SPECS
from app.models.scene import Scene, StageStatus
from app.models.character import Character
from app.models.location import Location
from app.providers.llm.base import LLMProvider
from app.providers.registry import get_llm_provider_for_team
from app.utils.prompts import (
    OUTLINE_SYSTEM_PROMPT, OUTLINE_USER_PROMPT,
    SCENARIO_SYSTEM_PROMPT, SCENARIO_USER_PROMPT,
    SCENES_SYSTEM_PROMPT, SCENES_USER_PROMPT,
    CHARACTERS_SYSTEM_PROMPT, CHARACTERS_USER_PROMPT,
)

logger = logging.getLogger(__name__)

ProgressCallback = Callable[[int, str], None]


def execute_stage(db: Session, project: Project, stage: str, progress: ProgressCallback):
    handlers = {
        "outline": _generate_outline,
        "scenario": _generate_scenario,
        "scenes": _generate_scenes,
        "characters": _generate_characters,
    }
    handler = handlers.get(stage)
    if handler is None:
        raise ValueError(f"No handler for stage: {stage}")
    handler(db, project, progress)


def _get_provider(db: Session, team_id) -> LLMProvider:
    return get_llm_provider_for_team(db, team_id)


def _generate_outline(db: Session, project: Project, progress: ProgressCallback):
    progress(10, "Preparing outline prompt...")
    provider = _get_provider(db, project.team_id)
    tier_spec = DURATION_TIER_SPECS[project.duration_tier]

    user_prompt = OUTLINE_USER_PROMPT.format(
        brief=project.brief,
        format=project.format.value,
        duration_tier=project.duration_tier.value,
        min_scenes=tier_spec["min_scenes"],
        max_scenes=tier_spec["max_scenes"],
        min_seconds=tier_spec["min_seconds"],
        max_seconds=tier_spec["max_seconds"],
    )

    progress(30, "Generating outline with AI...")
    result = provider.generate_sync(OUTLINE_SYSTEM_PROMPT, user_prompt)
    progress(80, "Saving outline...")

    project.outline = result
    db.commit()
    progress(100, "Outline generated")


def _generate_scenario(db: Session, project: Project, progress: ProgressCallback):
    progress(10, "Preparing scenario prompt...")
    provider = _get_provider(db, project.team_id)

    user_prompt = SCENARIO_USER_PROMPT.format(
        brief=project.brief,
        outline=project.outline or "",
        format=project.format.value,
    )

    progress(30, "Generating scenario with AI...")
    result = provider.generate_sync(SCENARIO_SYSTEM_PROMPT, user_prompt)
    progress(80, "Saving scenario...")

    project.scenario = result
    db.commit()
    progress(100, "Scenario generated")


def _generate_scenes(db: Session, project: Project, progress: ProgressCallback):
    progress(10, "Preparing scenes prompt...")
    provider = _get_provider(db, project.team_id)
    tier_spec = DURATION_TIER_SPECS[project.duration_tier]

    user_prompt = SCENES_USER_PROMPT.format(
        brief=project.brief,
        outline=project.outline or "",
        scenario=project.scenario or "",
        format=project.format.value,
        min_scenes=tier_spec["min_scenes"],
        max_scenes=tier_spec["max_scenes"],
    )

    progress(30, "Generating scenes with AI...")
    result = provider.generate_sync(SCENES_SYSTEM_PROMPT, user_prompt)
    progress(60, "Parsing scenes...")

    try:
        scenes_data = json.loads(result)
        if isinstance(scenes_data, dict) and "scenes" in scenes_data:
            scenes_data = scenes_data["scenes"]
    except json.JSONDecodeError:
        scenes_data = [{"title": "Scene 1", "description": result, "script": "", "voiceover_text": "", "image_prompt": ""}]

    existing = db.execute(select(Scene).where(Scene.project_id == project.id)).scalars().all()
    for s in existing:
        db.delete(s)
    db.flush()

    for i, scene_data in enumerate(scenes_data, 1):
        scene = Scene(
            project_id=project.id,
            scene_number=i,
            title=scene_data.get("title", f"Scene {i}"),
            description=scene_data.get("description", ""),
            script=scene_data.get("script", ""),
            image_prompt=scene_data.get("image_prompt", ""),
            voiceover_text=scene_data.get("voiceover_text", ""),
            status=StageStatus.AWAITING_APPROVAL,
            duration_seconds=scene_data.get("duration_seconds"),
        )
        db.add(scene)
        progress(60 + int(30 * i / len(scenes_data)), f"Created scene {i}/{len(scenes_data)}")

    db.commit()
    progress(100, f"Generated {len(scenes_data)} scenes")


def _generate_characters(db: Session, project: Project, progress: ProgressCallback):
    progress(10, "Preparing characters/locations prompt...")
    provider = _get_provider(db, project.team_id)

    scenes = db.execute(
        select(Scene).where(Scene.project_id == project.id).order_by(Scene.scene_number)
    ).scalars().all()

    scenes_text = "\n".join(
        f"Scene {s.scene_number}: {s.title}\n{s.description}\n{s.script}"
        for s in scenes
    )

    user_prompt = CHARACTERS_USER_PROMPT.format(
        brief=project.brief,
        scenario=project.scenario or "",
        scenes=scenes_text,
    )

    progress(30, "Extracting characters and locations with AI...")
    result = provider.generate_sync(CHARACTERS_SYSTEM_PROMPT, user_prompt)
    progress(60, "Parsing characters and locations...")

    try:
        data = json.loads(result)
    except json.JSONDecodeError:
        data = {"characters": [], "locations": []}

    for char_data in data.get("characters", []):
        character = Character(
            project_id=project.id,
            name=char_data.get("name", "Unknown"),
            appearance=char_data.get("appearance"),
            clothing=char_data.get("clothing"),
            personality=char_data.get("personality"),
            canonical_prompt=char_data.get("canonical_prompt", ""),
        )
        db.add(character)

    for loc_data in data.get("locations", []):
        location = Location(
            project_id=project.id,
            name=loc_data.get("name", "Unknown"),
            details=loc_data.get("details"),
            setting_description=loc_data.get("setting_description"),
            canonical_prompt=loc_data.get("canonical_prompt", ""),
        )
        db.add(location)

    db.commit()
    progress(100, f"Extracted {len(data.get('characters', []))} characters, {len(data.get('locations', []))} locations")
