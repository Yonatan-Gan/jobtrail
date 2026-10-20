from fastapi import APIRouter

from app.enums import Status
from app.status_rules import ALLOWED_TRANSITIONS

router = APIRouter(prefix="/meta", tags=["meta"])


@router.get("/status-transitions", response_model=dict[Status, list[Status]])
def status_transitions() -> dict[Status, list[Status]]:
    """Allowed next statuses for every status, so clients never keep their own copy.

    Each list follows the order of the Status enum: active stages first, then endings.
    """
    return {
        status: [candidate for candidate in Status if candidate in ALLOWED_TRANSITIONS[status]]
        for status in Status
    }
