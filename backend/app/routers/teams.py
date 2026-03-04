import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import DB, CurrentUser, CurrentTeam, require_role
from app.models.team import TeamRole, InvitationStatus
from app.schemas.team import (
    TeamCreate,
    TeamInvitationCreate,
    TeamInvitationResponse,
    TeamMemberResponse,
    TeamResponse,
)
from app.services.team import (
    accept_invitation,
    create_team,
    decline_invitation,
    get_team_members,
    get_user_teams,
    invite_member,
    remove_member,
    update_member_role,
)
from app.models.team import TeamInvitation
from sqlalchemy import select

router = APIRouter()


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_new_team(body: TeamCreate, db: DB, current_user: CurrentUser):
    team = await create_team(db, body.name, current_user)
    return team


@router.get("", response_model=list[TeamResponse])
async def list_teams(db: DB, current_user: CurrentUser):
    return await get_user_teams(db, current_user.id)


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team_detail(team: CurrentTeam):
    return team


@router.get("/{team_id}/members", response_model=list[TeamMemberResponse])
async def list_members(team_id: uuid.UUID, db: DB, team: CurrentTeam):
    return await get_team_members(db, team_id)


@router.post("/{team_id}/invitations", response_model=TeamInvitationResponse, status_code=status.HTTP_201_CREATED)
async def send_invitation(
    team_id: uuid.UUID,
    body: TeamInvitationCreate,
    db: DB,
    current_user: CurrentUser,
    team: CurrentTeam,
    _admin=Depends(require_role(TeamRole.OWNER, TeamRole.ADMIN)),
):
    try:
        invitation = await invite_member(db, team, body.email, body.role, current_user.id)
        return TeamInvitationResponse(
            id=invitation.id,
            team_id=invitation.team_id,
            email=invitation.email,
            role=invitation.role,
            status=invitation.status,
            created_at=invitation.created_at,
            expires_at=invitation.expires_at,
            team_name=team.name,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{team_id}/invitations", response_model=list[TeamInvitationResponse])
async def list_invitations(team_id: uuid.UUID, db: DB, team: CurrentTeam):
    result = await db.execute(
        select(TeamInvitation).where(
            TeamInvitation.team_id == team_id,
            TeamInvitation.status == InvitationStatus.PENDING,
        )
    )
    return [
        TeamInvitationResponse(
            id=inv.id, team_id=inv.team_id, email=inv.email, role=inv.role,
            status=inv.status, created_at=inv.created_at, expires_at=inv.expires_at,
            team_name=team.name,
        )
        for inv in result.scalars().all()
    ]


@router.patch("/{team_id}/members/{member_id}")
async def change_member_role(
    team_id: uuid.UUID,
    member_id: uuid.UUID,
    role: TeamRole,
    db: DB,
    team: CurrentTeam,
    _admin=Depends(require_role(TeamRole.OWNER)),
):
    try:
        await update_member_role(db, team_id, member_id, role)
        return {"updated": True}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{team_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(
    team_id: uuid.UUID,
    member_id: uuid.UUID,
    db: DB,
    team: CurrentTeam,
    _admin=Depends(require_role(TeamRole.OWNER, TeamRole.ADMIN)),
):
    try:
        await remove_member(db, team_id, member_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# User-facing invitation endpoints (not scoped to a team)
@router.get("/me/invitations", response_model=list[TeamInvitationResponse])
async def my_invitations(db: DB, current_user: CurrentUser):
    from app.models.team import Team
    result = await db.execute(
        select(TeamInvitation, Team.name)
        .join(Team, Team.id == TeamInvitation.team_id)
        .where(
            TeamInvitation.email == current_user.email,
            TeamInvitation.status == InvitationStatus.PENDING,
        )
    )
    return [
        TeamInvitationResponse(
            id=inv.id, team_id=inv.team_id, email=inv.email, role=inv.role,
            status=inv.status, created_at=inv.created_at, expires_at=inv.expires_at,
            team_name=team_name,
        )
        for inv, team_name in result.all()
    ]


@router.post("/invitations/{invitation_id}/accept")
async def accept_inv(invitation_id: uuid.UUID, db: DB, current_user: CurrentUser):
    try:
        await accept_invitation(db, invitation_id, current_user)
        return {"accepted": True}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/invitations/{invitation_id}/decline")
async def decline_inv(invitation_id: uuid.UUID, db: DB, current_user: CurrentUser):
    try:
        await decline_invitation(db, invitation_id, current_user)
        return {"declined": True}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
