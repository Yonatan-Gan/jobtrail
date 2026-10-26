from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal, Self

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    ValidationInfo,
    field_validator,
    model_validator,
)
from pydantic_core import PydanticCustomError

from app.enums import EmploymentType, Level, PositionType, Source, Status, WorkMode


def assume_utc(value: datetime) -> datetime:
    """Read a datetime without a time zone as UTC, so all datetimes can be compared."""
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


# An input datetime that is always timezone-aware. Postgres runs in UTC, so a value
# without an offset was already stored as UTC; this makes Python agree with it.
UtcDatetime = Annotated[datetime, AfterValidator(assume_utc)]

# How far ahead of the server's clock a status change may be dated, for a client whose
# clock runs a little fast.
FUTURE_TOLERANCE = timedelta(minutes=5)


def not_in_the_future(value: datetime) -> datetime:
    """A status change records something that already happened, so a future date is refused."""
    if value > datetime.now(UTC) + FUTURE_TOLERANCE:
        raise PydanticCustomError(
            "datetime_in_future",
            "A status change can't be dated in the future ({when} UTC is later than now).",
            {"when": f"{value.astimezone(UTC):%Y-%m-%d %H:%M}"},
        )
    return value


# The date of a status change (changed_at, applied_at): timezone-aware and not in the
# future. The validators run in order, so the comparison always has a time zone.
NotFutureUtcDatetime = Annotated[UtcDatetime, AfterValidator(not_in_the_future)]

SALARY_RANGE_MESSAGE = "salary_min must be less than or equal to salary_max"


def salary_range_ok(salary_min: int | None, salary_max: int | None) -> bool:
    """A range is fine unless both ends are known and the minimum is above the maximum."""
    return salary_min is None or salary_max is None or salary_min <= salary_max


def check_salary_max(salary_max: int | None, info: ValidationInfo) -> int | None:
    """Compare salary_max with salary_min, which Pydantic has validated just before it.

    The error belongs to the salary_max field, so the 422's loc is ["body", "salary_max"]
    and clients can show it next to that field. PydanticCustomError keeps the message
    exactly as written (a ValueError would get a "Value error, " prefix).
    """
    if not salary_range_ok(info.data.get("salary_min"), salary_max):
        raise PydanticCustomError("salary_range", SALARY_RANGE_MESSAGE)
    return salary_max


class CompanyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    website: str | None = Field(default=None, max_length=500)
    notes: str | None = None


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    website: str | None = Field(default=None, max_length=500)
    notes: str | None = None


class CompanyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    website: str | None
    notes: str | None
    created_at: datetime


class ApplicationCreate(BaseModel):
    company_id: int
    title: str = Field(min_length=1, max_length=200)
    position_type: PositionType
    level: Level = Level.JUNIOR
    employment_type: EmploymentType = EmploymentType.FULL_TIME
    work_mode: WorkMode | None = None
    city: str | None = Field(default=None, max_length=100)
    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)
    job_url: str | None = Field(default=None, max_length=1000)
    source: Source
    skills: list[str] = Field(default_factory=list)
    notes: str | None = None

    @field_validator("salary_max")
    @classmethod
    def check_salary_range(cls, salary_max: int | None, info: ValidationInfo) -> int | None:
        return check_salary_max(salary_max, info)


class ApplicationUpdate(BaseModel):
    company_id: int | None = None
    title: str | None = Field(default=None, min_length=1, max_length=200)
    position_type: PositionType | None = None
    level: Level | None = None
    employment_type: EmploymentType | None = None
    work_mode: WorkMode | None = None
    city: str | None = Field(default=None, max_length=100)
    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)
    job_url: str | None = Field(default=None, max_length=1000)
    source: Source | None = None
    skills: list[str] | None = None
    notes: str | None = None

    # Only sees both salaries when the PATCH sends both. The router compares a single one
    # with the stored value.
    @field_validator("salary_max")
    @classmethod
    def check_salary_range(cls, salary_max: int | None, info: ValidationInfo) -> int | None:
        return check_salary_max(salary_max, info)


class ApplicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    title: str
    position_type: PositionType
    level: Level
    employment_type: EmploymentType
    work_mode: WorkMode | None
    city: str | None
    salary_min: int | None
    salary_max: int | None
    job_url: str | None
    source: Source
    skills: list[str]
    status: Status
    applied_at: datetime | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class StatusChangeCreate(BaseModel):
    to_status: Status
    changed_at: NotFutureUtcDatetime | None = None
    note: str | None = None


class StatusChangeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    from_status: Status | None
    to_status: Status
    changed_at: datetime
    note: str | None


class ApplicationImportItem(BaseModel):
    company: str = Field(min_length=1, max_length=200)
    title: str = Field(min_length=1, max_length=200)
    position_type: PositionType
    level: Level = Level.JUNIOR
    employment_type: EmploymentType = EmploymentType.FULL_TIME
    work_mode: WorkMode | None = None
    city: str | None = Field(default=None, max_length=100)
    job_url: str = Field(min_length=1, max_length=1000)
    source: Source
    skills: list[str] = Field(default_factory=list)
    notes: str | None = None
    status: Literal[Status.SAVED, Status.APPLIED] = Status.SAVED
    applied_at: NotFutureUtcDatetime | None = None

    @model_validator(mode="after")
    def check_applied_at(self) -> Self:
        if self.applied_at is not None and self.status != Status.APPLIED:
            raise ValueError("applied_at can only be set when status is 'applied'")
        return self


class ImportResult(BaseModel):
    created: int
    updated: int
    skipped: int
    updated_urls: list[str]
    skipped_urls: list[str]


class FunnelStage(BaseModel):
    stage: Status
    count: int


class StatsRead(BaseModel):
    applied: int
    responded: int
    response_rate: float
    avg_days_to_first_response: float | None
    funnel: list[FunnelStage]
