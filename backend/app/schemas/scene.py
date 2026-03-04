import uuid
from datetime import datetime
from pydantic import BaseModel, Field

from app.models.scene import StageStatus


class SceneUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    script: str | None = None
    image_prompt: str | None = None
    voiceover_text: str | None = None
    duration_seconds: float | None = None


class SceneResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    scene_number: int
    title: str | None = None
    description: str | None = None
    script: str | None = None
    image_prompt: str | None = None
    voiceover_text: str | None = None
    status: StageStatus
    duration_seconds: float | None = None
    created_at: datetime
    updated_at: datetime
    assets: list["AssetResponse"] = []

    model_config = {"from_attributes": True}


class AssetResponse(BaseModel):
    id: uuid.UUID
    scene_id: uuid.UUID
    asset_type: str
    storage_path: str | None = None
    status: StageStatus
    metadata_: dict | None = None
    provider_used: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
