from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.enums import Status
from app.models import Application, StatusChange
from app.status_rules import can_transition


class InvalidTransitionError(Exception):
    def __init__(self, current: Status, new: Status) -> None:
        super().__init__(f"Cannot move from '{current}' to '{new}'")


def change_status(
    db: Session,
    application: Application,
    new_status: Status,
    changed_at: datetime | None = None,
    note: str | None = None,
) -> StatusChange:
    if not can_transition(application.status, new_status):
        raise InvalidTransitionError(application.status, new_status)

    when = changed_at or datetime.now(UTC)
    change = StatusChange(
        from_status=application.status,
        to_status=new_status,
        changed_at=when,
        note=note,
    )
    application.status_changes.append(change)
    application.status = new_status
    if new_status == Status.APPLIED and application.applied_at is None:
        application.applied_at = when

    db.commit()
    db.refresh(change)
    return change
