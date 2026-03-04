import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class LocationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    details: dict | None = None
    setting_description: str | None = None


class LocationUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    details: dict | None = None
    setting_description: str | None = None
    canonical_prompt: str | None = None


class LocationResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    details: dict | None = None
    setting_description: str | None = None
    canonical_prompt: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
