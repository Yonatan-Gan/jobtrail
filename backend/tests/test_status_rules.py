import pytest

from app.enums import Status
from app.status_rules import ALLOWED_TRANSITIONS, can_transition

FINAL_STATUSES = [Status.REJECTED, Status.WITHDRAWN, Status.ACCEPTED, Status.DECLINED]


def test_every_status_has_an_entry():
    assert set(ALLOWED_TRANSITIONS) == set(Status)


@pytest.mark.parametrize(
    ("current", "new"),
    [
        (Status.SAVED, Status.APPLIED),
        (Status.SAVED, Status.WITHDRAWN),
        (Status.APPLIED, Status.SCREENING),
        (Status.APPLIED, Status.GHOSTED),
        (Status.SCREENING, Status.FINAL),
        (Status.ASSIGNMENT, Status.TECHNICAL),
        (Status.TECHNICAL, Status.TECHNICAL),
        (Status.TECHNICAL, Status.OFFER),
        (Status.FINAL, Status.OFFER),
        (Status.OFFER, Status.ACCEPTED),
        (Status.OFFER, Status.DECLINED),
        (Status.GHOSTED, Status.SCREENING),
        (Status.GHOSTED, Status.REJECTED),
    ],
)
def test_allowed_transitions(current, new):
    assert can_transition(current, new) is True


@pytest.mark.parametrize(
    ("current", "new"),
    [
        (Status.SAVED, Status.SCREENING),
        (Status.SAVED, Status.OFFER),
        (Status.APPLIED, Status.FINAL),
        (Status.APPLIED, Status.OFFER),
        (Status.SCREENING, Status.SAVED),
        (Status.SCREENING, Status.SCREENING),
        (Status.FINAL, Status.TECHNICAL),
        (Status.OFFER, Status.REJECTED),
        (Status.OFFER, Status.GHOSTED),
        (Status.OFFER, Status.WITHDRAWN),
        (Status.GHOSTED, Status.WITHDRAWN),
        (Status.GHOSTED, Status.OFFER),
    ],
)
def test_forbidden_transitions(current, new):
    assert can_transition(current, new) is False


@pytest.mark.parametrize("final", FINAL_STATUSES)
def test_final_statuses_allow_nothing(final):
    for new in Status:
        assert can_transition(final, new) is False
