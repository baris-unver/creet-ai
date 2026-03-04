import uuid
from pydantic import BaseModel

from app.models.project import PipelineStage


class PipelineAction(BaseModel):
    action: str  # "generate" | "approve" | "regenerate"
    stage: PipelineStage
    data: dict | None = None


class PipelineStageUpdate(BaseModel):
    content: str | None = None
    data: dict | None = None


class PipelineStatusResponse(BaseModel):
    project_id: uuid.UUID
    current_stage: PipelineStage
    pipeline_state: dict
    active_job_id: uuid.UUID | None = None

    model_config = {"from_attributes": True}


class ProgressMessage(BaseModel):
    project_id: str
    stage: str
    progress: int = 0
    message: str = ""
    status: str = "running"
