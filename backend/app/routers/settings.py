import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import DB, CurrentUser, CurrentTeam, require_role
from app.models.team import TeamRole, TeamSettings
from app.schemas.team import TeamSettingsUpdate, TeamSettingsResponse
from app.services.team import update_team_settings

router = APIRouter()


@router.get("/{team_id}/settings", response_model=TeamSettingsResponse)
async def get_settings(team_id: uuid.UUID, db: DB, team: CurrentTeam):
    result = await db.execute(select(TeamSettings).where(TeamSettings.team_id == team_id))
    ts = result.scalar_one_or_none()
    if not ts:
        return TeamSettingsResponse()
    return TeamSettingsResponse(
        llm_provider=ts.llm_provider,
        has_llm_key=ts.llm_api_key_enc is not None,
        image_provider=ts.image_provider,
        has_image_key=ts.image_api_key_enc is not None,
        tts_provider=ts.tts_provider,
        has_tts_key=ts.tts_api_key_enc is not None,
    )


@router.put("/{team_id}/settings", response_model=TeamSettingsResponse)
async def save_settings(
    team_id: uuid.UUID,
    body: TeamSettingsUpdate,
    db: DB,
    team: CurrentTeam,
    _admin=Depends(require_role(TeamRole.OWNER, TeamRole.ADMIN)),
):
    ts = await update_team_settings(
        db,
        team_id,
        llm_provider=body.llm_provider,
        llm_api_key=body.llm_api_key,
        image_provider=body.image_provider,
        image_api_key=body.image_api_key,
        tts_provider=body.tts_provider,
        tts_api_key=body.tts_api_key,
    )
    return TeamSettingsResponse(
        llm_provider=ts.llm_provider,
        has_llm_key=ts.llm_api_key_enc is not None,
        image_provider=ts.image_provider,
        has_image_key=ts.image_api_key_enc is not None,
        tts_provider=ts.tts_provider,
        has_tts_key=ts.tts_api_key_enc is not None,
    )
