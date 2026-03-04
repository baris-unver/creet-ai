import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.dependencies import DB, CurrentUser, CurrentTeam, require_role
from app.models.project import Project, PipelineStage
from app.models.team import TeamRole
from app.schemas.pipeline import PipelineAction, PipelineStageUpdate, PipelineStatusResponse
from app.services.pipeline import advance_stage, regenerate_stage, get_pipeline_status

router = APIRouter()


@router.get("", response_model=PipelineStatusResponse)
async def pipeline_status(
    team_id: uuid.UUID,
    project_id: uuid.UUID,
    db: DB,
    team: CurrentTeam,
):
    return await get_pipeline_status(db, project_id, team_id)


@router.post("/action")
async def pipeline_action(
    team_id: uuid.UUID,
    project_id: uuid.UUID,
    body: PipelineAction,
    db: DB,
    current_user: CurrentUser,
    team: CurrentTeam,
    _member=Depends(require_role(TeamRole.OWNER, TeamRole.ADMIN, TeamRole.MEMBER)),
):
    if body.action == "generate":
        from app.tasks.pipeline import run_pipeline_stage
        task = run_pipeline_stage.delay(str(project_id), str(team_id), body.stage.value)
        return {"task_id": task.id, "status": "queued"}
    elif body.action == "approve":
        result = await advance_stage(db, project_id, team_id, body.stage)
        next_stage = result
        auto_generate_stages = {"outline", "scenario", "scenes", "characters"}
        if next_stage in auto_generate_stages:
            from app.tasks.pipeline import run_pipeline_stage
            task = run_pipeline_stage.delay(str(project_id), str(team_id), next_stage)
            return {"status": "approved", "next_stage": next_stage, "task_id": task.id, "auto_generating": True}
        return {"status": "approved", "next_stage": next_stage}
    elif body.action == "regenerate":
        await regenerate_stage(db, project_id, team_id, body.stage)
        from app.tasks.pipeline import run_pipeline_stage
        task = run_pipeline_stage.delay(str(project_id), str(team_id), body.stage.value)
        return {"task_id": task.id, "status": "regenerating"}
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown action: {body.action}")


@router.put("/{stage}", response_model=PipelineStatusResponse)
async def update_stage_content(
    team_id: uuid.UUID,
    project_id: uuid.UUID,
    stage: PipelineStage,
    body: PipelineStageUpdate,
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

    if stage == PipelineStage.OUTLINE and body.content:
        project.outline = body.content
    elif stage == PipelineStage.SCENARIO and body.content:
        project.scenario = body.content

    await db.commit()
    return await get_pipeline_status(db, project_id, team_id)
