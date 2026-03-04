import uuid
from datetime import datetime
from pydantic import BaseModel, Field

from app.models.team import TeamRole, InvitationStatus


class TeamCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)


class TeamResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    created_by: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class TeamMemberResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    role: TeamRole
    joined_at: datetime
    user_name: str | None = None
    user_email: str | None = None
    user_avatar: str | None = None

    model_config = {"from_attributes": True}


class TeamInvitationCreate(BaseModel):
    email: str = Field(max_length=320)
    role: TeamRole = TeamRole.MEMBER


class TeamInvitationResponse(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    email: str
    role: TeamRole
    status: InvitationStatus
    created_at: datetime
    expires_at: datetime
    team_name: str | None = None

    model_config = {"from_attributes": True}


class TeamSettingsUpdate(BaseModel):
    llm_provider: str | None = None
    llm_api_key: str | None = None
    image_provider: str | None = None
    image_api_key: str | None = None
    tts_provider: str | None = None
    tts_api_key: str | None = None


class TeamSettingsResponse(BaseModel):
    llm_provider: str | None = None
    has_llm_key: bool = False
    image_provider: str | None = None
    has_image_key: bool = False
    tts_provider: str | None = None
    has_tts_key: bool = False

    model_config = {"from_attributes": True}
