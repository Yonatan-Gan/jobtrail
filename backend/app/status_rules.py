from app.enums import Status

ALLOWED_TRANSITIONS: dict[Status, set[Status]] = {
    Status.SAVED: {Status.APPLIED, Status.WITHDRAWN},
    Status.APPLIED: {
        Status.SCREENING,
        Status.ASSIGNMENT,
        Status.TECHNICAL,
        Status.REJECTED,
        Status.GHOSTED,
        Status.WITHDRAWN,
    },
    Status.SCREENING: {
        Status.ASSIGNMENT,
        Status.TECHNICAL,
        Status.FINAL,
        Status.REJECTED,
        Status.GHOSTED,
        Status.WITHDRAWN,
    },
    Status.ASSIGNMENT: {
        Status.TECHNICAL,
        Status.FINAL,
        Status.REJECTED,
        Status.GHOSTED,
        Status.WITHDRAWN,
    },
    Status.TECHNICAL: {
        Status.TECHNICAL,
        Status.FINAL,
        Status.OFFER,
        Status.REJECTED,
        Status.GHOSTED,
        Status.WITHDRAWN,
    },
    Status.FINAL: {
        Status.OFFER,
        Status.REJECTED,
        Status.GHOSTED,
        Status.WITHDRAWN,
    },
    Status.OFFER: {Status.ACCEPTED, Status.DECLINED},
    Status.GHOSTED: {
        Status.SCREENING,
        Status.ASSIGNMENT,
        Status.TECHNICAL,
        Status.FINAL,
        Status.REJECTED,
    },
    Status.REJECTED: set(),
    Status.WITHDRAWN: set(),
    Status.ACCEPTED: set(),
    Status.DECLINED: set(),
}


def can_transition(current: Status, new: Status) -> bool:
    # return True if the move is allowed
    return new in ALLOWED_TRANSITIONS.get(current, set())