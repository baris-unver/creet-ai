import json
import logging

import redis
from sqlalchemy import select

from app.config import get_settings
from app.database import SyncSessionLocal
from app.models.project import Project, PipelineStage, DURATION_TIER_SPECS
from app.models.scene import Scene, StageStatus
from app.models.character import Character
from app.models.location import Location
from app.models.pipeline import PipelineJob, JobStatus
from app.tasks.celery_app import celery

logger = logging.getLogger(__name__)


def _get_redis():
    settings = get_settings()
    return redis.from_url(settings.REDIS_URL)


def _publish_progress(project_id: str, stage: str, progress: int, message: str = "", status: str = "running"):
    r = _get_redis()
    r.publish(f"project:{project_id}", json.dumps({
        "type": "progress",
        "project_id": project_id,
        "stage": stage,
        "progress": progress,
        "message": message,
        "status": status,
    }))


@celery.task(bind=True, name="app.tasks.pipeline.run_pipeline_stage")
def run_pipeline_stage(self, project_id: str, team_id: str, stage: str):
    db = SyncSessionLocal()
    try:
        project = db.execute(
            select(Project).where(Project.id == project_id, Project.team_id == team_id)
        ).scalar_one_or_none()
        if not project:
            logger.error(f"Project {project_id} not found")
            return

        job = PipelineJob(
            project_id=project_id,
            stage=stage,
            celery_task_id=self.request.id,
            status=JobStatus.RUNNING,
        )
        db.add(job)

        state = dict(project.pipeline_state)
        state[stage] = "generating"
        project.pipeline_state = state
        db.commit()

        _publish_progress(project_id, stage, 0, f"Starting {stage} generation...")

        from app.services.pipeline_executor import execute_stage
        try:
            execute_stage(db, project, stage, lambda p, m: _publish_progress(project_id, stage, p, m))
        except Exception as e:
            logger.exception(f"Pipeline stage {stage} failed for project {project_id}")
            state = dict(project.pipeline_state)
            state[stage] = "failed"
            project.pipeline_state = state
            job.status = JobStatus.FAILED
            job.error = str(e)
            db.commit()
            _publish_progress(project_id, stage, 0, str(e), "failed")
            raise

        state = dict(project.pipeline_state)
        state[stage] = "awaiting_approval"
        project.pipeline_state = state
        job.status = JobStatus.COMPLETED
        db.commit()

        _publish_progress(project_id, stage, 100, f"{stage} generation complete", "completed")

    finally:
        db.close()
