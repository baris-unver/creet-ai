from celery import Celery
from celery.schedules import crontab

from app.config import get_settings

settings = get_settings()

celery = Celery(
    "videocraft",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=3600,
    beat_schedule={
        "cleanup-expired-locks": {
            "task": "app.tasks.cleanup.cleanup_expired_locks",
            "schedule": crontab(minute="*/5"),
        },
        "cleanup-old-exports": {
            "task": "app.tasks.cleanup.cleanup_old_exports",
            "schedule": crontab(hour=3, minute=0),
        },
    },
)

celery.conf.update(
    include=[
        "app.tasks.pipeline",
        "app.tasks.media",
        "app.tasks.assembly",
        "app.tasks.cleanup",
    ]
)
