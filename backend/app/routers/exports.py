import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.dependencies import DB, CurrentUser, CurrentTeam, require_role
from app.models.export import Export, ExportStatus
from app.models.team import TeamRole
from app.schemas.export import ExportCreate, ExportResponse
from app.services.storage import generate_presigned_url

router = APIRouter()


@router.get("", response_model=list[ExportResponse])
async def list_exports(team_id: uuid.UUID, project_id: uuid.UUID, db: DB, team: CurrentTeam):
    result = await db.execute(
        select(Export).where(Export.project_id == project_id).order_by(Export.created_at.desc())
    )
    exports = result.scalars().all()
    response = []
    for exp in exports:
        resp = ExportResponse.model_validate(exp)
        if exp.status == ExportStatus.COMPLETED and exp.storage_path:
            resp.download_url = generate_presigned_url(exp.storage_path)
        response.append(resp)
    return response


@router.post("", response_model=ExportResponse, status_code=status.HTTP_201_CREATED)
async def create_export(
    team_id: uuid.UUID,
    project_id: uuid.UUID,
    body: ExportCreate,
    db: DB,
    current_user: CurrentUser,
    team: CurrentTeam,
    _member=Depends(require_role(TeamRole.OWNER, TeamRole.ADMIN, TeamRole.MEMBER)),
):
    export = Export(project_id=project_id, format=body.format)
    db.add(export)
    await db.commit()
    await db.refresh(export)

    from app.tasks.assembly import assemble_video
    assemble_video.delay(str(export.id), str(project_id), str(team_id))

    return ExportResponse.model_validate(export)


@router.get("/{export_id}", response_model=ExportResponse)
async def get_export(
    team_id: uuid.UUID,
    project_id: uuid.UUID,
    export_id: uuid.UUID,
    db: DB,
    team: CurrentTeam,
):
    result = await db.execute(
        select(Export).where(Export.id == export_id, Export.project_id == project_id)
    )
    export = result.scalar_one_or_none()
    if not export:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export not found")

    resp = ExportResponse.model_validate(export)
    if export.status == ExportStatus.COMPLETED and export.storage_path:
        resp.download_url = generate_presigned_url(export.storage_path)
    return resp
