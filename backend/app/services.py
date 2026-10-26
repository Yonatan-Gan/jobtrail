from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import Status
from app.models import Application, Company, StatusChange
from app.schemas import ApplicationImportItem, ImportResult, assume_utc
from app.status_rules import can_transition

# Service functions change objects in the session but never commit.
# The caller (the endpoint) commits once, so one request is one transaction.


class InvalidTransitionError(Exception):
    def __init__(self, current: Status, new: Status) -> None:
        super().__init__(f"Cannot move from '{current}' to '{new}'")


class StatusChangeTooEarlyError(Exception):
    """A status change dated before the application's latest one: the history would be
    out of order."""

    def __init__(self, latest: StatusChange) -> None:
        when = latest.changed_at.astimezone(UTC)
        super().__init__(
            "This change can't be dated before the latest status change "
            f"({latest.to_status} on {when:%Y-%m-%d} at {when:%H:%M} UTC)."
        )


def new_application(fields: dict[str, Any], saved_at: datetime | None = None) -> Application:
    """Build an application in status 'saved' with its first history row (None -> saved)."""
    application = Application(**fields, status=Status.SAVED)
    application.status_changes.append(
        StatusChange(
            from_status=None,
            to_status=Status.SAVED,
            changed_at=assume_utc(saved_at) if saved_at else datetime.now(UTC),
        )
    )
    return application


def get_status_history(db: Session, application_id: int) -> list[StatusChange]:
    """The status history of one application, oldest first.

    Always query with an explicit ORDER BY. Within one session, application.status_changes
    can still be in insertion order, so reading it directly gives an order that depends on
    the session cache. Rows with the same changed_at keep insertion order (id).
    """
    stmt = (
        select(StatusChange)
        .where(StatusChange.application_id == application_id)
        .order_by(StatusChange.changed_at, StatusChange.id)
    )
    return list(db.scalars(stmt))


def change_status(
    application: Application,
    new_status: Status,
    changed_at: datetime | None = None,
    note: str | None = None,
) -> StatusChange:
    if not can_transition(application.status, new_status):
        raise InvalidTransitionError(application.status, new_status)

    when = assume_utc(changed_at) if changed_at else datetime.now(UTC)
    check_not_before_latest(application, new_status, when)
    change = StatusChange(
        from_status=application.status,
        to_status=new_status,
        changed_at=when,
        note=note,
    )
    application.status_changes.append(change)
    application.status = new_status
    if new_status == Status.APPLIED:
        if application.applied_at is None:
            application.applied_at = when
        move_saved_row_back(application, when)
    return change


def check_not_before_latest(application: Application, new_status: Status, when: datetime) -> None:
    """A new change can't be dated before the latest one, so the history stays in order.

    The one exception: applying earlier than the job was added to JobTrail. The "saved"
    row only records when the job entered JobTrail, so move_saved_row_back() moves it
    back instead.

    max() doesn't depend on the list's order, and the relationship also holds rows that
    are not in the database yet (during an import), so this reads it directly.
    """
    dated = [row for row in application.status_changes if row.changed_at is not None]
    # max() keeps the first of equal values, so reversed() lets ties go to the row added
    # last: after a backdated "applied", the saved row has the same time as the applied row.
    latest = max(reversed(dated), key=lambda row: row.changed_at, default=None)
    if latest is None or when >= latest.changed_at:
        return
    if new_status == Status.APPLIED and latest.to_status == Status.SAVED:
        return
    raise StatusChangeTooEarlyError(latest)


def move_saved_row_back(application: Application, applied_at: datetime) -> None:
    """You can't apply before saving: if the application was applied earlier than its
    "saved" row (applied on Monday, added to JobTrail on Wednesday), move that row back.

    This searches the rows instead of ordering them, so it uses the relationship: it must
    also see rows that are not in the database yet, such as during an import.
    """
    for row in application.status_changes:
        if row.to_status == Status.SAVED and row.changed_at > applied_at:
            row.changed_at = applied_at


def import_applications(db: Session, items: list[ApplicationImportItem]) -> ImportResult:
    """Add new applications from an import file to the session.

    A job URL that already exists is skipped, except one case: an "applied" item for an
    application that is still "saved" moves it to applied through change_status.
    A job URL that appears again later in the same file is always skipped.
    """
    urls = [item.job_url for item in items]
    names = {item.company for item in items}
    existing = {
        a.job_url: a for a in db.scalars(select(Application).where(Application.job_url.in_(urls)))
    }
    companies = {c.name: c for c in db.scalars(select(Company).where(Company.name.in_(names)))}

    created = 0
    updated_urls: list[str] = []
    skipped_urls: list[str] = []
    seen_urls: set[str] = set()
    for item in items:
        if item.job_url in seen_urls:
            skipped_urls.append(item.job_url)
            continue
        seen_urls.add(item.job_url)

        application = existing.get(item.job_url)
        if application is not None:
            if item.status == Status.APPLIED and application.status == Status.SAVED:
                change_status(application, Status.APPLIED, changed_at=item.applied_at)
                updated_urls.append(item.job_url)
            else:
                skipped_urls.append(item.job_url)
            continue

        company = companies.get(item.company)
        if company is None:
            company = Company(name=item.company)
            db.add(company)
            companies[item.company] = company

        fields = item.model_dump(exclude={"company", "status", "applied_at"})
        fields["company"] = company
        if item.status == Status.APPLIED:
            applied_at = item.applied_at or datetime.now(UTC)
            application = new_application(fields, saved_at=applied_at)
            change_status(application, Status.APPLIED, changed_at=applied_at)
        else:
            application = new_application(fields)
        db.add(application)
        created += 1

    return ImportResult(
        created=created,
        updated=len(updated_urls),
        skipped=len(skipped_urls),
        updated_urls=updated_urls,
        skipped_urls=skipped_urls,
    )
