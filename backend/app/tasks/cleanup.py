import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, delete

from app.database import SyncSessionLocal
from app.models.project import ProjectLock
from app.tasks.celery_app import celery

logger = logging.getLogger(__name__)


@celery.task(name="app.tasks.cleanup.cleanup_expired_locks")
def cleanup_expired_locks():
    db = SyncSessionLocal()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)
        result = db.execute(
            delete(ProjectLock).where(ProjectLock.last_ping < cutoff)
        )
        db.commit()
        if result.rowcount > 0:
            logger.info(f"Cleaned up {result.rowcount} expired project locks")
    finally:
        db.close()


@celery.task(name="app.tasks.cleanup.cleanup_old_exports")
def cleanup_old_exports():
    db = SyncSessionLocal()
    try:
        from app.models.export import Export, ExportStatus
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        result = db.execute(
            select(Export).where(
                Export.created_at < cutoff,
                Export.status == ExportStatus.COMPLETED,
            )
        )
        exports = result.scalars().all()
        for export in exports:
            if export.storage_path:
                try:
                    from app.services.storage import delete_file
                    delete_file(export.storage_path)
                except Exception:
                    pass
            db.delete(export)
        db.commit()
        if exports:
            logger.info(f"Cleaned up {len(exports)} old exports")
    finally:
        db.close()
