import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import ProjectLock

LOCK_TIMEOUT_MINUTES = 30


async def acquire_project_lock(
    db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID
) -> ProjectLock | None:
    await _cleanup_expired_lock(db, project_id)

    result = await db.execute(select(ProjectLock).where(ProjectLock.project_id == project_id))
    existing = result.scalar_one_or_none()

    if existing is not None:
        if existing.locked_by == user_id:
            existing.last_ping = datetime.now(timezone.utc)
            await db.commit()
            return existing
        return None

    lock = ProjectLock(project_id=project_id, locked_by=user_id)
    db.add(lock)
    await db.commit()
    await db.refresh(lock)
    return lock


async def release_project_lock(
    db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID
):
    result = await db.execute(
        select(ProjectLock).where(
            ProjectLock.project_id == project_id,
            ProjectLock.locked_by == user_id,
        )
    )
    lock = result.scalar_one_or_none()
    if lock:
        await db.delete(lock)
        await db.commit()


async def ping_project_lock(
    db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID
) -> bool:
    result = await db.execute(
        select(ProjectLock).where(
            ProjectLock.project_id == project_id,
            ProjectLock.locked_by == user_id,
        )
    )
    lock = result.scalar_one_or_none()
    if lock is None:
        return False
    lock.last_ping = datetime.now(timezone.utc)
    await db.commit()
    return True


async def _cleanup_expired_lock(db: AsyncSession, project_id: uuid.UUID):
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=LOCK_TIMEOUT_MINUTES)
    await db.execute(
        delete(ProjectLock).where(
            ProjectLock.project_id == project_id,
            ProjectLock.last_ping < cutoff,
        )
    )
    await db.commit()
