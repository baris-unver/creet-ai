import uuid
from datetime import datetime
from pydantic import BaseModel

from app.models.project import VideoFormat
from app.models.export import ExportStatus


class ExportCreate(BaseModel):
    format: VideoFormat


class ExportResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    format: VideoFormat
    status: ExportStatus
    storage_path: str | None = None
    duration_seconds: float | None = None
    file_size_bytes: int | None = None
    created_at: datetime
    completed_at: datetime | None = None
    download_url: str | None = None

    model_config = {"from_attributes": True}
