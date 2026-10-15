from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.enums import Status
from app.models import StatusChange
from app.schemas import FunnelStage, StatsRead

RESPONSE_STATUSES = {
    Status.SCREENING,
    Status.ASSIGNMENT,
    Status.TECHNICAL,
    Status.FINAL,
    Status.OFFER,
    Status.REJECTED,
}

FUNNEL_STAGES = (
    Status.APPLIED,
    Status.SCREENING,
    Status.ASSIGNMENT,
    Status.TECHNICAL,
    Status.FINAL,
    Status.OFFER,
)

SECONDS_PER_DAY = 86400


def get_response_counts(db: Session) -> tuple[int, int]:
    """Return (applied, responded): applications that ever reached each point."""
    distinct_apps = func.count(func.distinct(StatusChange.application_id))
    stmt = select(
        distinct_apps.filter(StatusChange.to_status == Status.APPLIED),
        distinct_apps.filter(StatusChange.to_status.in_(RESPONSE_STATUSES)),
    )
    applied, responded = db.execute(stmt).one()
    return applied, responded


def get_avg_days_to_first_response(db: Session) -> float | None:
    """Average days from applying to the first response, or None if nobody replied yet."""
    applied = (
        select(
            StatusChange.application_id,
            func.min(StatusChange.changed_at).label("applied_at"),
        )
        .where(StatusChange.to_status == Status.APPLIED)
        .group_by(StatusChange.application_id)
        .cte("applied")
    )
    first_reply = (
        select(
            StatusChange.application_id,
            func.min(StatusChange.changed_at).label("replied_at"),
        )
        .join(applied, applied.c.application_id == StatusChange.application_id)
        .where(
            StatusChange.to_status.in_(RESPONSE_STATUSES),
            StatusChange.changed_at >= applied.c.applied_at,
        )
        .group_by(StatusChange.application_id)
        .cte("first_reply")
    )
    seconds = func.extract("epoch", first_reply.c.replied_at - applied.c.applied_at)
    stmt = select(func.avg(seconds) / SECONDS_PER_DAY).select_from(
        applied.join(first_reply, first_reply.c.application_id == applied.c.application_id)
    )
    avg_days = db.execute(stmt).scalar_one()
    return None if avg_days is None else float(avg_days)


def get_funnel(db: Session) -> list[FunnelStage]:
    """For each stage, count applications that reached it or any later stage."""
    distinct_apps = func.count(func.distinct(StatusChange.application_id))
    columns = [
        distinct_apps.filter(StatusChange.to_status.in_(FUNNEL_STAGES[i:]))
        for i in range(len(FUNNEL_STAGES))
    ]
    counts = db.execute(select(*columns)).one()
    return [
        FunnelStage(stage=stage, count=count)
        for stage, count in zip(FUNNEL_STAGES, counts, strict=True)
    ]


def get_stats(db: Session) -> StatsRead:
    applied, responded = get_response_counts(db)
    return StatsRead(
        applied=applied,
        responded=responded,
        response_rate=responded / applied if applied else 0.0,
        avg_days_to_first_response=get_avg_days_to_first_response(db),
        funnel=get_funnel(db),
    )
