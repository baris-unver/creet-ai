import re
import uuid
from datetime import datetime, timedelta, timezone

import resend
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models.team import Team, TeamMember, TeamInvitation, TeamSettings, TeamRole, InvitationStatus
from app.models.usage import CreditBalance
from app.models.user import User
from app.utils.encryption import encrypt_value, decrypt_value


def slugify(name: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", name.lower())
    return re.sub(r"[-\s]+", "-", slug).strip("-")


async def create_team(db: AsyncSession, name: str, user: User) -> Team:
    base_slug = slugify(name)
    slug = base_slug
    counter = 1
    while True:
        existing = await db.execute(select(Team).where(Team.slug == slug))
        if existing.scalar_one_or_none() is None:
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    team = Team(name=name, slug=slug, created_by=user.id)
    db.add(team)
    await db.flush()

    member = TeamMember(team_id=team.id, user_id=user.id, role=TeamRole.OWNER)
    db.add(member)

    settings = TeamSettings(team_id=team.id)
    db.add(settings)

    balance = CreditBalance(team_id=team.id)
    db.add(balance)

    await db.commit()
    await db.refresh(team)
    return team


async def get_user_teams(db: AsyncSession, user_id: uuid.UUID) -> list[Team]:
    result = await db.execute(
        select(Team)
        .join(TeamMember, TeamMember.team_id == Team.id)
        .where(TeamMember.user_id == user_id)
        .order_by(Team.created_at.desc())
    )
    return list(result.scalars().all())


async def get_team_members(db: AsyncSession, team_id: uuid.UUID) -> list[dict]:
    result = await db.execute(
        select(TeamMember, User)
        .join(User, User.id == TeamMember.user_id)
        .where(TeamMember.team_id == team_id)
        .order_by(TeamMember.joined_at)
    )
    members = []
    for member, user in result.all():
        members.append({
            "id": member.id,
            "user_id": member.user_id,
            "role": member.role,
            "joined_at": member.joined_at,
            "user_name": user.name,
            "user_email": user.email,
            "user_avatar": user.avatar_url,
        })
    return members


async def invite_member(
    db: AsyncSession,
    team: Team,
    email: str,
    role: TeamRole,
    invited_by: uuid.UUID,
) -> TeamInvitation:
    existing_user = await db.execute(select(User).where(User.email == email))
    user = existing_user.scalar_one_or_none()
    if user:
        existing_member = await db.execute(
            select(TeamMember).where(TeamMember.team_id == team.id, TeamMember.user_id == user.id)
        )
        if existing_member.scalar_one_or_none():
            raise ValueError("User is already a member of this team")

    invitation = TeamInvitation(
        team_id=team.id,
        email=email,
        role=role,
        invited_by=invited_by,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)

    settings = get_settings()
    try:
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": settings.FROM_EMAIL,
            "to": [email],
            "subject": f"You've been invited to {team.name} on VideoCraft",
            "html": f"""
                <h2>Team Invitation</h2>
                <p>You've been invited to join <strong>{team.name}</strong> on VideoCraft as a <strong>{role.value}</strong>.</p>
                <p><a href="{settings.APP_URL}/invitations">Accept Invitation</a></p>
                <p>This invitation expires in 7 days.</p>
            """,
        })
    except Exception:
        pass

    return invitation


async def accept_invitation(db: AsyncSession, invitation_id: uuid.UUID, user: User) -> TeamMember:
    result = await db.execute(select(TeamInvitation).where(TeamInvitation.id == invitation_id))
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise ValueError("Invitation not found")
    if invitation.email != user.email:
        raise ValueError("This invitation is not for you")
    if invitation.status != InvitationStatus.PENDING:
        raise ValueError("Invitation is no longer pending")
    if invitation.expires_at < datetime.now(timezone.utc):
        invitation.status = InvitationStatus.EXPIRED
        await db.commit()
        raise ValueError("Invitation has expired")

    member = TeamMember(team_id=invitation.team_id, user_id=user.id, role=invitation.role)
    db.add(member)
    invitation.status = InvitationStatus.ACCEPTED
    await db.commit()
    await db.refresh(member)
    return member


async def decline_invitation(db: AsyncSession, invitation_id: uuid.UUID, user: User):
    result = await db.execute(select(TeamInvitation).where(TeamInvitation.id == invitation_id))
    invitation = result.scalar_one_or_none()
    if not invitation or invitation.email != user.email:
        raise ValueError("Invitation not found")
    invitation.status = InvitationStatus.DECLINED
    await db.commit()


async def update_member_role(
    db: AsyncSession, team_id: uuid.UUID, member_id: uuid.UUID, new_role: TeamRole
):
    result = await db.execute(
        select(TeamMember).where(TeamMember.id == member_id, TeamMember.team_id == team_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise ValueError("Member not found")
    member.role = new_role
    await db.commit()


async def remove_member(db: AsyncSession, team_id: uuid.UUID, member_id: uuid.UUID):
    result = await db.execute(
        select(TeamMember).where(TeamMember.id == member_id, TeamMember.team_id == team_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise ValueError("Member not found")
    if member.role == TeamRole.OWNER:
        raise ValueError("Cannot remove the team owner")
    await db.delete(member)
    await db.commit()


async def update_team_settings(
    db: AsyncSession,
    team_id: uuid.UUID,
    llm_provider: str | None = None,
    llm_api_key: str | None = None,
    image_provider: str | None = None,
    image_api_key: str | None = None,
    tts_provider: str | None = None,
    tts_api_key: str | None = None,
) -> TeamSettings:
    result = await db.execute(select(TeamSettings).where(TeamSettings.team_id == team_id))
    ts = result.scalar_one_or_none()
    if not ts:
        ts = TeamSettings(team_id=team_id)
        db.add(ts)

    if llm_provider is not None:
        ts.llm_provider = llm_provider
    if llm_api_key is not None:
        ts.llm_api_key_enc = encrypt_value(llm_api_key) if llm_api_key else None
    if image_provider is not None:
        ts.image_provider = image_provider
    if image_api_key is not None:
        ts.image_api_key_enc = encrypt_value(image_api_key) if image_api_key else None
    if tts_provider is not None:
        ts.tts_provider = tts_provider
    if tts_api_key is not None:
        ts.tts_api_key_enc = encrypt_value(tts_api_key) if tts_api_key else None

    await db.commit()
    await db.refresh(ts)
    return ts
