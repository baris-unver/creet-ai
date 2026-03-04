import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.dependencies import DB, CurrentUser, CurrentTeam, require_role
from app.models.character import Character
from app.models.team import TeamRole
from app.schemas.character import CharacterCreate, CharacterUpdate, CharacterResponse

router = APIRouter()


@router.get("", response_model=list[CharacterResponse])
async def list_characters(team_id: uuid.UUID, project_id: uuid.UUID, db: DB, team: CurrentTeam):
    result = await db.execute(
        select(Character).where(Character.project_id == project_id).order_by(Character.created_at)
    )
    return result.scalars().all()


@router.post("", response_model=CharacterResponse, status_code=status.HTTP_201_CREATED)
async def create_character(
    team_id: uuid.UUID,
    project_id: uuid.UUID,
    body: CharacterCreate,
    db: DB,
    team: CurrentTeam,
    _member=Depends(require_role(TeamRole.OWNER, TeamRole.ADMIN, TeamRole.MEMBER)),
):
    character = Character(project_id=project_id, **body.model_dump())
    db.add(character)
    await db.commit()
    await db.refresh(character)
    return character


@router.patch("/{character_id}", response_model=CharacterResponse)
async def update_character(
    team_id: uuid.UUID,
    project_id: uuid.UUID,
    character_id: uuid.UUID,
    body: CharacterUpdate,
    db: DB,
    team: CurrentTeam,
    _member=Depends(require_role(TeamRole.OWNER, TeamRole.ADMIN, TeamRole.MEMBER)),
):
    result = await db.execute(
        select(Character).where(Character.id == character_id, Character.project_id == project_id)
    )
    character = result.scalar_one_or_none()
    if not character:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(character, field, value)

    await db.commit()
    await db.refresh(character)
    return character


@router.delete("/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_character(
    team_id: uuid.UUID,
    project_id: uuid.UUID,
    character_id: uuid.UUID,
    db: DB,
    team: CurrentTeam,
    _member=Depends(require_role(TeamRole.OWNER, TeamRole.ADMIN, TeamRole.MEMBER)),
):
    result = await db.execute(
        select(Character).where(Character.id == character_id, Character.project_id == project_id)
    )
    character = result.scalar_one_or_none()
    if not character:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found")
    await db.delete(character)
    await db.commit()
