import uuid
from datetime import datetime
from pydantic import BaseModel, Field

from app.models.project import VideoFormat, DurationTier, PipelineStage


class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    brief: str = Field(min_length=10, max_length=10000)
    format: VideoFormat
    duration_tier: DurationTier


class ProjectUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=500)
    brief: str | None = Field(None, min_length=10, max_length=10000)
    format: VideoFormat | None = None
    duration_tier: DurationTier | None = None


class ProjectResponse(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    title: str
    brief: str | None = None
    format: VideoFormat
    duration_tier: DurationTier
    pipeline_stage: PipelineStage
    pipeline_state: dict
    outline: str | None = None
    scenario: str | None = None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
    is_locked: bool = False
    locked_by: uuid.UUID | None = None

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    id: uuid.UUID
    title: str
    format: VideoFormat
    duration_tier: DurationTier
    pipeline_stage: PipelineStage
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LockResponse(BaseModel):
    locked: bool
    locked_by: uuid.UUID | None = None
    locked_at: datetime | None = None
