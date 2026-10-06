from enum import StrEnum


class Status(StrEnum):
    SAVED = "saved"
    APPLIED = "applied"
    SCREENING = "screening"
    ASSIGNMENT = "assignment"
    TECHNICAL = "technical"
    FINAL = "final"
    OFFER = "offer"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"
    GHOSTED = "ghosted"


class PositionType(StrEnum):
    BACKEND = "backend"
    FRONTEND = "frontend"
    FULLSTACK = "fullstack"
    DEVOPS = "devops"
    DATA = "data"
    QA = "qa"
    OTHER = "other"


class Level(StrEnum):
    INTERN = "intern"
    JUNIOR = "junior"
    MID = "mid"


class EmploymentType(StrEnum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    STUDENT = "student"


class WorkMode(StrEnum):
    ONSITE = "onsite"
    HYBRID = "hybrid"
    REMOTE = "remote"


class Source(StrEnum):
    LINKEDIN = "linkedin"
    COMPANY_SITE = "company_site"
    REFERRAL = "referral"
    JOB_BOARD = "job_board"
    RECRUITER = "recruiter"
    OTHER = "other"


class ContactRole(StrEnum):
    RECRUITER = "recruiter"
    REFERRER = "referrer"
    HIRING_MANAGER = "hiring_manager"
    INTERVIEWER = "interviewer"
    OTHER = "other"
