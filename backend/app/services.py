from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import Status
from app.models import Application, Company, StatusChange
from app.schemas import ApplicationImportItem, ImportResult
from app.status_rules import can_transition

# Service functions change objects in the session but never commit.
# The caller (the endpoint) commits once, so one request is one transaction.


class InvalidTransitionError(Exception):
    def __init__(self, current: Status, new: Status) -> None:
        super().__init__(f"Cannot move from '{current}' to '{new}'")


def new_application(fields: dict[str, Any], saved_at: datetime | None = None) -> Application:
    """Build an application in status 'saved' with its first history row (None -> saved)."""
    application = Application(**fields, status=Status.SAVED)
    application.status_changes.append(
        StatusChange(
            from_status=None,
            to_status=Status.SAVED,
            changed_at=saved_at or datetime.now(UTC),
        )
    )
    return application


def change_status(
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
    return change


def import_applications(db: Session, items: list[ApplicationImportItem]) -> ImportResult:
    """Add new applications from an import file to the session, skipping known job URLs."""
    urls = [item.job_url for item in items]
    names = {item.company for item in items}
    known_urls = set(db.scalars(select(Application.job_url).where(Application.job_url.in_(urls))))
    companies = {c.name: c for c in db.scalars(select(Company).where(Company.name.in_(names)))}

    created = 0
    skipped_urls: list[str] = []
    for item in items:
        if item.job_url in known_urls:
            skipped_urls.append(item.job_url)
            continue
        known_urls.add(item.job_url)

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

    return ImportResult(created=created, skipped=len(skipped_urls), skipped_urls=skipped_urls)
