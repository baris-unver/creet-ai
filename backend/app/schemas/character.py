import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class CharacterCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    appearance: dict | None = None
    clothing: str | None = None
    personality: str | None = None


class CharacterUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    appearance: dict | None = None
    clothing: str | None = None
    personality: str | None = None
    canonical_prompt: str | None = None


class CharacterResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    appearance: dict | None = None
    clothing: str | None = None
    personality: str | None = None
    canonical_prompt: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
