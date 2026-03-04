import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.dependencies import DB, CurrentUser, CurrentTeam, require_role
from app.models.location import Location
from app.models.team import TeamRole
from app.schemas.location import LocationCreate, LocationUpdate, LocationResponse

router = APIRouter()


@router.get("", response_model=list[LocationResponse])
async def list_locations(team_id: uuid.UUID, project_id: uuid.UUID, db: DB, team: CurrentTeam):
    result = await db.execute(
        select(Location).where(Location.project_id == project_id).order_by(Location.created_at)
    )
    return result.scalars().all()


@router.post("", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(
    team_id: uuid.UUID,
    project_id: uuid.UUID,
    body: LocationCreate,
    db: DB,
    team: CurrentTeam,
    _member=Depends(require_role(TeamRole.OWNER, TeamRole.ADMIN, TeamRole.MEMBER)),
):
    location = Location(project_id=project_id, **body.model_dump())
    db.add(location)
    await db.commit()
    await db.refresh(location)
    return location


@router.patch("/{location_id}", response_model=LocationResponse)
async def update_location(
    team_id: uuid.UUID,
    project_id: uuid.UUID,
    location_id: uuid.UUID,
    body: LocationUpdate,
    db: DB,
    team: CurrentTeam,
    _member=Depends(require_role(TeamRole.OWNER, TeamRole.ADMIN, TeamRole.MEMBER)),
):
    result = await db.execute(
        select(Location).where(Location.id == location_id, Location.project_id == project_id)
    )
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(location, field, value)

    await db.commit()
    await db.refresh(location)
    return location


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    team_id: uuid.UUID,
    project_id: uuid.UUID,
    location_id: uuid.UUID,
    db: DB,
    team: CurrentTeam,
    _member=Depends(require_role(TeamRole.OWNER, TeamRole.ADMIN, TeamRole.MEMBER)),
):
    result = await db.execute(
        select(Location).where(Location.id == location_id, Location.project_id == project_id)
    )
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    await db.delete(location)
    await db.commit()
