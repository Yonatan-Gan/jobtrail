from fastapi import APIRouter, HTTPException
from fastapi import status as http
from psycopg.errors import UniqueViolation
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db import DbSession
from app.enums import PositionType, Status
from app.models import Application, Company, StatusChange
from app.schemas import (
    ApplicationCreate,
    ApplicationImportItem,
    ApplicationRead,
    ApplicationUpdate,
    ImportResult,
    StatusChangeCreate,
    StatusChangeRead,
)
from app.services import (
    InvalidTransitionError,
    change_status,
    get_status_history,
    import_applications,
    new_application,
)

router = APIRouter(prefix="/applications", tags=["applications"])

DUPLICATE_JOB_URL = "An application with this job_url already exists"


def get_application_or_404(db: DbSession, application_id: int) -> Application:
    application = db.get(Application, application_id)
    if application is None:
        raise HTTPException(http.HTTP_404_NOT_FOUND, "Application not found")
    return application


@router.post("", response_model=ApplicationRead, status_code=http.HTTP_201_CREATED)
def create_application(payload: ApplicationCreate, db: DbSession) -> Application:
    if db.get(Company, payload.company_id) is None:
        raise HTTPException(422, "Company does not exist")
    application = new_application(payload.model_dump())
    db.add(application)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(http.HTTP_409_CONFLICT, DUPLICATE_JOB_URL) from None
    db.refresh(application)
    return application


@router.post("/import", response_model=ImportResult)
def bulk_import(items: list[ApplicationImportItem], db: DbSession) -> ImportResult:
    try:
        result = import_applications(db, items)
        db.commit()
    except (IntegrityError, InvalidTransitionError):
        db.rollback()
        raise HTTPException(
            http.HTTP_409_CONFLICT, "Import conflicts with existing data; nothing was imported"
        ) from None
    return result


@router.get("", response_model=list[ApplicationRead])
def list_applications(
    db: DbSession,
    status: Status | None = None,
    company_id: int | None = None,
    position_type: PositionType | None = None,
    job_url: str | None = None,
) -> list[Application]:
    stmt = select(Application).order_by(Application.created_at.desc())
    if job_url is not None:
        stmt = stmt.where(Application.job_url == job_url)
    if status is not None:
        stmt = stmt.where(Application.status == status)
    if company_id is not None:
        stmt = stmt.where(Application.company_id == company_id)
    if position_type is not None:
        stmt = stmt.where(Application.position_type == position_type)
    return list(db.scalars(stmt))


@router.get("/{application_id}", response_model=ApplicationRead)
def get_application(application_id: int, db: DbSession) -> Application:
    return get_application_or_404(db, application_id)


@router.patch("/{application_id}", response_model=ApplicationRead)
def update_application(
    application_id: int, payload: ApplicationUpdate, db: DbSession
) -> Application:
    application = get_application_or_404(db, application_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(application, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if isinstance(exc.orig, UniqueViolation):
            raise HTTPException(http.HTTP_409_CONFLICT, DUPLICATE_JOB_URL) from None
        raise HTTPException(422, "Invalid update: check company_id and salary range") from None
    db.refresh(application)
    return application


@router.delete("/{application_id}", status_code=http.HTTP_204_NO_CONTENT)
def delete_application(application_id: int, db: DbSession) -> None:
    application = get_application_or_404(db, application_id)
    db.delete(application)
    db.commit()


@router.post(
    "/{application_id}/status",
    response_model=StatusChangeRead,
    status_code=http.HTTP_201_CREATED,
)
def update_status(application_id: int, payload: StatusChangeCreate, db: DbSession) -> StatusChange:
    application = get_application_or_404(db, application_id)
    try:
        change = change_status(application, payload.to_status, payload.changed_at, payload.note)
    except InvalidTransitionError as exc:
        raise HTTPException(http.HTTP_409_CONFLICT, str(exc)) from None
    db.commit()
    db.refresh(change)
    return change


@router.get("/{application_id}/history", response_model=list[StatusChangeRead])
def get_history(application_id: int, db: DbSession) -> list[StatusChange]:
    get_application_or_404(db, application_id)
    return get_status_history(db, application_id)
