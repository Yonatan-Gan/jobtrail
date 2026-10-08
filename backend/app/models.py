from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.enums import (
    ContactRole,
    EmploymentType,
    Level,
    PositionType,
    Source,
    Status,
    WorkMode,
)


def enum_column(enum_cls):
    """Store enums as plain strings (VARCHAR), validated in Python."""
    return SAEnum(
        enum_cls,
        native_enum=False,
        length=30,
        values_callable=lambda e: [member.value for member in e],
    )


class CreatedAtMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Company(CreatedAtMixin, Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    website: Mapped[str | None] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)

    applications: Mapped[list["Application"]] = relationship(back_populates="company")
    contacts: Mapped[list["Contact"]] = relationship(back_populates="company")


class Application(CreatedAtMixin, Base):
    __tablename__ = "applications"
    __table_args__ = (
        CheckConstraint(
            "salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max",
            name="salary_range",
        ),
        Index("ix_applications_skills", "skills", postgresql_using="gin"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="RESTRICT"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    position_type: Mapped[PositionType] = mapped_column(enum_column(PositionType))
    level: Mapped[Level] = mapped_column(
        enum_column(Level), default=Level.JUNIOR, server_default=Level.JUNIOR.value
    )
    employment_type: Mapped[EmploymentType] = mapped_column(
        enum_column(EmploymentType),
        default=EmploymentType.FULL_TIME,
        server_default=EmploymentType.FULL_TIME.value,
    )
    work_mode: Mapped[WorkMode | None] = mapped_column(enum_column(WorkMode))
    city: Mapped[str | None] = mapped_column(String(100))
    salary_min: Mapped[int | None]
    salary_max: Mapped[int | None]
    job_url: Mapped[str | None] = mapped_column(String(1000))
    source: Mapped[Source] = mapped_column(enum_column(Source))
    skills: Mapped[list[str]] = mapped_column(ARRAY(String(50)), default=list, server_default="{}")
    status: Mapped[Status] = mapped_column(
        enum_column(Status), default=Status.SAVED, server_default=Status.SAVED.value, index=True
    )
    applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    company: Mapped["Company"] = relationship(back_populates="applications")
    status_changes: Mapped[list["StatusChange"]] = relationship(
        back_populates="application",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="StatusChange.changed_at",
    )
    contact_links: Mapped[list["ApplicationContact"]] = relationship(
        back_populates="application", cascade="all, delete-orphan", passive_deletes=True
    )


class StatusChange(Base):
    __tablename__ = "status_changes"
    __table_args__ = (
        Index("ix_status_changes_application_changed", "application_id", "changed_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id", ondelete="CASCADE"))
    from_status: Mapped[Status | None] = mapped_column(enum_column(Status))
    to_status: Mapped[Status] = mapped_column(enum_column(Status))
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    note: Mapped[str | None] = mapped_column(Text)

    application: Mapped["Application"] = relationship(back_populates="status_changes")


class Contact(CreatedAtMixin, Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int | None] = mapped_column(
        ForeignKey("companies.id", ondelete="SET NULL"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    title: Mapped[str | None] = mapped_column(String(200))
    email: Mapped[str | None] = mapped_column(String(320))
    phone: Mapped[str | None] = mapped_column(String(50))
    linkedin_url: Mapped[str | None] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)

    company: Mapped["Company | None"] = relationship(back_populates="contacts")
    application_links: Mapped[list["ApplicationContact"]] = relationship(
        back_populates="contact", cascade="all, delete-orphan", passive_deletes=True
    )


class ApplicationContact(Base):
    __tablename__ = "application_contacts"

    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), primary_key=True
    )
    contact_id: Mapped[int] = mapped_column(
        ForeignKey("contacts.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[ContactRole] = mapped_column(enum_column(ContactRole))

    application: Mapped["Application"] = relationship(back_populates="contact_links")
    contact: Mapped["Contact"] = relationship(back_populates="application_links")
