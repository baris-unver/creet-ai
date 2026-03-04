import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.dependencies import DB, CurrentUser, CurrentTeam, require_role
from app.models.project import Project
from app.models.scene import Scene
from app.models.team import TeamRole
from app.schemas.scene import SceneUpdate, SceneResponse

router = APIRouter()


@router.get("", response_model=list[SceneResponse])
async def list_scenes(team_id: uuid.UUID, project_id: uuid.UUID, db: DB, team: CurrentTeam):
    result = await db.execute(
        select(Scene)
        .where(Scene.project_id == project_id)
        .order_by(Scene.scene_number)
    )
    return result.scalars().all()


@router.get("/{scene_id}", response_model=SceneResponse)
async def get_scene(
    team_id: uuid.UUID, project_id: uuid.UUID, scene_id: uuid.UUID, db: DB, team: CurrentTeam
):
    result = await db.execute(
        select(Scene).where(Scene.id == scene_id, Scene.project_id == project_id)
    )
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scene not found")
    return scene


@router.patch("/{scene_id}", response_model=SceneResponse)
async def update_scene(
    team_id: uuid.UUID,
    project_id: uuid.UUID,
    scene_id: uuid.UUID,
    body: SceneUpdate,
    db: DB,
    team: CurrentTeam,
    _member=Depends(require_role(TeamRole.OWNER, TeamRole.ADMIN, TeamRole.MEMBER)),
):
    result = await db.execute(
        select(Scene).where(Scene.id == scene_id, Scene.project_id == project_id)
    )
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scene not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(scene, field, value)

    await db.commit()
    await db.refresh(scene)
    return scene


@router.post("/{scene_id}/approve")
async def approve_scene(
    team_id: uuid.UUID,
    project_id: uuid.UUID,
    scene_id: uuid.UUID,
    db: DB,
    team: CurrentTeam,
    _member=Depends(require_role(TeamRole.OWNER, TeamRole.ADMIN, TeamRole.MEMBER)),
):
    from app.models.scene import StageStatus
    result = await db.execute(
        select(Scene).where(Scene.id == scene_id, Scene.project_id == project_id)
    )
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scene not found")
    scene.status = StageStatus.APPROVED
    await db.commit()
    return {"approved": True}
