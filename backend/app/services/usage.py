import uuid
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.usage import UsageEvent, UsageEventType


def log_usage(
    db: Session,
    team_id: uuid.UUID,
    event_type: UsageEventType,
    project_id: uuid.UUID | None = None,
    details: dict | None = None,
    provider: str | None = None,
    credit_cost: Decimal = Decimal("0"),
):
    event = UsageEvent(
        team_id=team_id,
        project_id=project_id,
        event_type=event_type,
        details=details or {},
        provider=provider,
        credit_cost=credit_cost,
    )
    db.add(event)
    db.commit()
