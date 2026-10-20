from fastapi.testclient import TestClient

from app.enums import Status
from app.main import app
from app.status_rules import ALLOWED_TRANSITIONS

client = TestClient(app)


def get_transitions() -> dict[str, list[str]]:
    response = client.get("/meta/status-transitions")
    assert response.status_code == 200
    return response.json()


def test_status_transitions_match_the_rules() -> None:
    transitions = get_transitions()

    assert set(transitions) == {status.value for status in Status}
    for status, allowed in ALLOWED_TRANSITIONS.items():
        assert set(transitions[status]) == {s.value for s in allowed}


def test_status_transitions_follow_enum_order() -> None:
    transitions = get_transitions()

    assert transitions["saved"] == ["applied", "withdrawn"]
    assert transitions["applied"] == [
        "screening",
        "assignment",
        "technical",
        "rejected",
        "withdrawn",
        "ghosted",
    ]
    assert transitions["rejected"] == []
