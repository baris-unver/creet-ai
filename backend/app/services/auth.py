import uuid
from datetime import datetime, timedelta, timezone

import httpx
import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models.policy import PolicyAcceptance
from app.models.team import TeamInvitation, TeamMember, InvitationStatus
from app.models.user import User

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


def create_token(user_id: uuid.UUID, settings: Settings) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def verify_token(token: str, settings: Settings) -> dict | None:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


async def exchange_google_code(code: str, settings: Settings) -> dict:
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        token_resp.raise_for_status()
        tokens = token_resp.json()

        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        userinfo_resp.raise_for_status()
        return userinfo_resp.json()


async def upsert_user(db: AsyncSession, google_user: dict) -> User:
    result = await db.execute(select(User).where(User.google_id == google_user["id"]))
    user = result.scalar_one_or_none()

    if user is None:
        from sqlalchemy import func
        count_result = await db.execute(select(func.count()).select_from(User))
        is_first_user = count_result.scalar() == 0

        user = User(
            email=google_user["email"],
            name=google_user.get("name", google_user["email"]),
            avatar_url=google_user.get("picture"),
            google_id=google_user["id"],
            is_superadmin=is_first_user,
        )
        db.add(user)
        await db.flush()
    else:
        user.name = google_user.get("name", user.name)
        user.avatar_url = google_user.get("picture", user.avatar_url)

    await db.commit()
    await db.refresh(user)
    return user


async def process_pending_invitations(db: AsyncSession, user: User):
    result = await db.execute(
        select(TeamInvitation).where(
            TeamInvitation.email == user.email,
            TeamInvitation.status == InvitationStatus.PENDING,
            TeamInvitation.expires_at > datetime.now(timezone.utc),
        )
    )
    invitations = result.scalars().all()

    for inv in invitations:
        existing = await db.execute(
            select(TeamMember).where(TeamMember.team_id == inv.team_id, TeamMember.user_id == user.id)
        )
        if existing.scalar_one_or_none() is None:
            member = TeamMember(team_id=inv.team_id, user_id=user.id, role=inv.role)
            db.add(member)
        inv.status = InvitationStatus.ACCEPTED

    await db.commit()


async def has_accepted_policy(db: AsyncSession, user_id: uuid.UUID, policy_version: str) -> bool:
    result = await db.execute(
        select(PolicyAcceptance).where(
            PolicyAcceptance.user_id == user_id,
            PolicyAcceptance.policy_version == policy_version,
        )
    )
    return result.scalar_one_or_none() is not None


async def record_policy_acceptance(
    db: AsyncSession,
    user_id: uuid.UUID,
    policy_version: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
):
    acceptance = PolicyAcceptance(
        user_id=user_id,
        policy_version=policy_version,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(acceptance)
    await db.commit()
