from fastapi import APIRouter, HTTPException
from fastapi import status as http
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db import DbSession
from app.enums import PositionType, Status
from app.models import Application, Company, StatusChange
from app.schemas import (
    ApplicationCreate,
    ApplicationRead,
    ApplicationUpdate,
    StatusChangeCreate,
    StatusChangeRead,
)
from app.services import InvalidTransitionError, change_status

router = APIRouter(prefix="/applications", tags=["applications"])


def get_application_or_404(db: DbSession, application_id: int) -> Application:
    application = db.get(Application, application_id)
    if application is None:
        raise HTTPException(http.HTTP_404_NOT_FOUND, "Application not found")
    return application


@router.post("", response_model=ApplicationRead, status_code=http.HTTP_201_CREATED)
def create_application(payload: ApplicationCreate, db: DbSession) -> Application:
    if db.get(Company, payload.company_id) is None:
        raise HTTPException(422, "Company does not exist")
    application = Application(**payload.model_dump(), status=Status.SAVED)
    application.status_changes.append(StatusChange(from_status=None, to_status=Status.SAVED))
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


@router.get("", response_model=list[ApplicationRead])
def list_applications(
    db: DbSession,
    status: Status | None = None,
    company_id: int | None = None,
    position_type: PositionType | None = None,
) -> list[Application]:
    stmt = select(Application).order_by(Application.created_at.desc())
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
    except IntegrityError:
        db.rollback()
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
def update_status(
    application_id: int, payload: StatusChangeCreate, db: DbSession
) -> StatusChange:
    application = get_application_or_404(db, application_id)
    try:
        return change_status(
            db, application, payload.to_status, payload.changed_at, payload.note
        )
    except InvalidTransitionError as exc:
        raise HTTPException(http.HTTP_409_CONFLICT, str(exc)) from None


@router.get("/{application_id}/history", response_model=list[StatusChangeRead])
def get_history(application_id: int, db: DbSession) -> list[StatusChange]:
    return get_application_or_404(db, application_id).status_changes
