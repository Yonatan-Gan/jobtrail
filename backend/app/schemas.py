from datetime import datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.enums import EmploymentType, Level, PositionType, Source, Status, WorkMode


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

    @model_validator(mode="after")
    def check_salary_range(self) -> Self:
        if (
            self.salary_min is not None
            and self.salary_max is not None
            and self.salary_min > self.salary_max
        ):
            raise ValueError("salary_min must be less than or equal to salary_max")
        return self


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
    changed_at: datetime | None = None
    note: str | None = None


class StatusChangeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    from_status: Status | None
    to_status: Status
    changed_at: datetime
    note: str | None
