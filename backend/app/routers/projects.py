import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import DB, CurrentUser, CurrentTeam, require_role
from app.models.project import Project, ProjectLock, PipelineStage
from app.models.team import TeamRole
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse, LockResponse

router = APIRouter()


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    team_id: uuid.UUID,
    body: ProjectCreate,
    db: DB,
    current_user: CurrentUser,
    team: CurrentTeam,
    _member=Depends(require_role(TeamRole.OWNER, TeamRole.ADMIN, TeamRole.MEMBER)),
):
    initial_state = {stage.value: "pending" for stage in PipelineStage if stage != PipelineStage.COMPLETE}
    initial_state[PipelineStage.BRIEF.value] = "approved"

    project = Project(
        team_id=team_id,
        title=body.title,
        brief=body.brief,
        format=body.format,
        duration_tier=body.duration_tier,
        pipeline_stage=PipelineStage.BRIEF,
        pipeline_state=initial_state,
        created_by=current_user.id,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("", response_model=list[ProjectListResponse])
async def list_projects(team_id: uuid.UUID, db: DB, team: CurrentTeam):
    result = await db.execute(
        select(Project)
        .where(Project.team_id == team_id)
        .order_by(Project.updated_at.desc())
    )
    return result.scalars().all()


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(team_id: uuid.UUID, project_id: uuid.UUID, db: DB, team: CurrentTeam):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.team_id == team_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    lock_result = await db.execute(select(ProjectLock).where(ProjectLock.project_id == project_id))
    lock = lock_result.scalar_one_or_none()

    resp = ProjectResponse.model_validate(project)
    if lock:
        resp.is_locked = True
        resp.locked_by = lock.locked_by
    return resp


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    team_id: uuid.UUID,
    project_id: uuid.UUID,
    body: ProjectUpdate,
    db: DB,
    current_user: CurrentUser,
    team: CurrentTeam,
    _member=Depends(require_role(TeamRole.OWNER, TeamRole.ADMIN, TeamRole.MEMBER)),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.team_id == team_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if body.title is not None:
        project.title = body.title
    if body.brief is not None:
        project.brief = body.brief
    if body.format is not None:
        if project.pipeline_stage != PipelineStage.BRIEF:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Format can only be changed during the brief stage")
        project.format = body.format
    if body.duration_tier is not None:
        if project.pipeline_stage != PipelineStage.BRIEF:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Duration can only be changed during the brief stage")
        project.duration_tier = body.duration_tier

    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    team_id: uuid.UUID,
    project_id: uuid.UUID,
    db: DB,
    team: CurrentTeam,
    _admin=Depends(require_role(TeamRole.OWNER, TeamRole.ADMIN)),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.team_id == team_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    await db.delete(project)
    await db.commit()


@router.post("/{project_id}/lock", response_model=LockResponse)
async def acquire_lock(
    team_id: uuid.UUID,
    project_id: uuid.UUID,
    db: DB,
    current_user: CurrentUser,
    team: CurrentTeam,
):
    from app.services.lock import acquire_project_lock
    lock = await acquire_project_lock(db, project_id, current_user.id)
    if lock is None:
        existing = await db.execute(select(ProjectLock).where(ProjectLock.project_id == project_id))
        ex = existing.scalar_one_or_none()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Project is locked by another user",
        )
    return LockResponse(locked=True, locked_by=lock.locked_by, locked_at=lock.locked_at)


@router.delete("/{project_id}/lock", response_model=LockResponse)
async def release_lock(
    team_id: uuid.UUID,
    project_id: uuid.UUID,
    db: DB,
    current_user: CurrentUser,
    team: CurrentTeam,
):
    from app.services.lock import release_project_lock
    await release_project_lock(db, project_id, current_user.id)
    return LockResponse(locked=False)


@router.post("/{project_id}/lock/ping")
async def ping_lock(
    team_id: uuid.UUID,
    project_id: uuid.UUID,
    db: DB,
    current_user: CurrentUser,
    team: CurrentTeam,
):
    from app.services.lock import ping_project_lock
    success = await ping_project_lock(db, project_id, current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Lock not held")
    return {"pinged": True}
