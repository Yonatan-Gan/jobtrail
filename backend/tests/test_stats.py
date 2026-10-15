from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

START = datetime(2026, 1, 1, tzinfo=UTC)
FUNNEL_STAGES = ["applied", "screening", "assignment", "technical", "final", "offer"]


def days(n: float) -> timedelta:
    return timedelta(days=n)


def expected_funnel(*counts: int) -> list[dict]:
    return [
        {"stage": stage, "count": count} for stage, count in zip(FUNNEL_STAGES, counts, strict=True)
    ]


def make_company(client: TestClient) -> int:
    response = client.post("/companies", json={"name": "Wix"})
    assert response.status_code == 201, response.text
    return response.json()["id"]


def seed_application(client: TestClient, company_id: int, *steps: tuple[str, timedelta]) -> int:
    """Create an application, then apply (status, days-after-START) steps in order."""
    response = client.post(
        "/applications",
        json={
            "company_id": company_id,
            "title": "Junior Backend Engineer",
            "position_type": "backend",
            "source": "linkedin",
        },
    )
    assert response.status_code == 201, response.text
    application_id = response.json()["id"]
    for status, offset in steps:
        response = client.post(
            f"/applications/{application_id}/status",
            json={"to_status": status, "changed_at": (START + offset).isoformat()},
        )
        assert response.status_code == 201, response.text
    return application_id


def test_stats_with_no_data(client: TestClient) -> None:
    response = client.get("/stats")
    assert response.status_code == 200
    assert response.json() == {
        "applied": 0,
        "responded": 0,
        "response_rate": 0.0,
        "avg_days_to_first_response": None,
        "funnel": expected_funnel(0, 0, 0, 0, 0, 0),
    }


def test_stats_when_nobody_replied(client: TestClient) -> None:
    company_id = make_company(client)
    seed_application(client, company_id, ("applied", days(0)), ("ghosted", days(30)))
    seed_application(client, company_id)

    body = client.get("/stats").json()
    assert body["applied"] == 1
    assert body["responded"] == 0
    assert body["response_rate"] == 0.0
    assert body["avg_days_to_first_response"] is None
    assert body["funnel"] == expected_funnel(1, 0, 0, 0, 0, 0)


def test_stats_for_mixed_applications(client: TestClient) -> None:
    company_id = make_company(client)
    seed_application(
        client,
        company_id,
        ("applied", days(0)),
        ("screening", days(0.5)),
        ("technical", days(3)),
        ("final", days(5)),
        ("offer", days(7)),
    )
    seed_application(client, company_id, ("applied", days(0)), ("rejected", days(4)))
    seed_application(
        client,
        company_id,
        ("applied", days(0)),
        ("ghosted", days(10)),
        ("screening", days(20)),
    )
    seed_application(client, company_id, ("applied", days(0)), ("ghosted", days(30)))
    seed_application(
        client,
        company_id,
        ("applied", days(0)),
        ("technical", days(6)),
        ("ghosted", days(20)),
    )
    seed_application(client, company_id)

    body = client.get("/stats").json()
    assert body["applied"] == 5
    assert body["responded"] == 4
    assert body["response_rate"] == pytest.approx(0.8)
    assert body["avg_days_to_first_response"] == pytest.approx((0.5 + 4 + 20 + 6) / 4)
    assert body["funnel"] == expected_funnel(5, 3, 2, 2, 1, 1)
