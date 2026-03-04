import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project, PipelineStage, STAGE_ORDER
from app.schemas.pipeline import PipelineStatusResponse


async def get_pipeline_status(
    db: AsyncSession, project_id: uuid.UUID, team_id: uuid.UUID
) -> PipelineStatusResponse:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.team_id == team_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    return PipelineStatusResponse(
        project_id=project.id,
        current_stage=project.pipeline_stage,
        pipeline_state=project.pipeline_state,
    )


async def advance_stage(
    db: AsyncSession, project_id: uuid.UUID, team_id: uuid.UUID, stage: PipelineStage
) -> str:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.team_id == team_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    state = dict(project.pipeline_state)
    state[stage.value] = "approved"

    # When review is approved, auto-approve assembly and jump to complete
    if stage == PipelineStage.REVIEW:
        state[PipelineStage.ASSEMBLY.value] = "approved"
        project.pipeline_stage = PipelineStage.COMPLETE
    else:
        current_idx = STAGE_ORDER.index(stage)
        if current_idx + 1 < len(STAGE_ORDER):
            next_stage = STAGE_ORDER[current_idx + 1]
            # Skip assembly stage — export page handles it
            if next_stage == PipelineStage.ASSEMBLY:
                state[PipelineStage.ASSEMBLY.value] = "approved"
                project.pipeline_stage = PipelineStage.COMPLETE
            else:
                project.pipeline_stage = next_stage
        else:
            project.pipeline_stage = PipelineStage.COMPLETE

    project.pipeline_state = state
    await db.commit()
    return project.pipeline_stage.value


async def regenerate_stage(
    db: AsyncSession, project_id: uuid.UUID, team_id: uuid.UUID, stage: PipelineStage
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.team_id == team_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    state = dict(project.pipeline_state)
    state[stage.value] = "generating"

    stage_idx = STAGE_ORDER.index(stage)
    for downstream in STAGE_ORDER[stage_idx + 1:]:
        if downstream == PipelineStage.COMPLETE:
            continue
        if state.get(downstream.value) == "approved":
            state[downstream.value] = "needs_review"

    project.pipeline_stage = stage
    project.pipeline_state = state
    await db.commit()
