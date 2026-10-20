from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app import services
from app.enums import Status
from app.services import InvalidTransitionError


def make_company(client: TestClient, name: str = "Wix") -> dict:
    response = client.post("/companies", json={"name": name})
    assert response.status_code == 201, response.text
    return response.json()


def make_application(client: TestClient, company_id: int, **overrides) -> dict:
    payload = {
        "company_id": company_id,
        "title": "Junior Backend Engineer",
        "position_type": "backend",
        "source": "linkedin",
    }
    payload.update(overrides)
    response = client.post("/applications", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_create_company(client: TestClient) -> None:
    company = make_company(client)
    assert company["name"] == "Wix"
    assert "id" in company


def test_duplicate_company_returns_409(client: TestClient) -> None:
    make_company(client)
    response = client.post("/companies", json={"name": "Wix"})
    assert response.status_code == 409


def test_empty_company_name_returns_422(client: TestClient) -> None:
    response = client.post("/companies", json={"name": ""})
    assert response.status_code == 422


def test_missing_company_returns_404(client: TestClient) -> None:
    response = client.get("/companies/999999")
    assert response.status_code == 404


def test_new_application_starts_saved_with_history(client: TestClient) -> None:
    company = make_company(client)
    application = make_application(client, company["id"])
    assert application["status"] == "saved"
    assert application["applied_at"] is None

    history = client.get(f"/applications/{application['id']}/history").json()
    assert len(history) == 1
    assert history[0]["from_status"] is None
    assert history[0]["to_status"] == "saved"


def test_status_changes_follow_rules_and_record_history(client: TestClient) -> None:
    company = make_company(client)
    app_id = make_application(client, company["id"])["id"]
    status_url = f"/applications/{app_id}/status"

    response = client.post(status_url, json={"to_status": "applied"})
    assert response.status_code == 201
    assert client.get(f"/applications/{app_id}").json()["applied_at"] is not None

    response = client.post(status_url, json={"to_status": "offer"})
    assert response.status_code == 409

    response = client.post(status_url, json={"to_status": "screening", "note": "HR call"})
    assert response.status_code == 201
    assert client.get(f"/applications/{app_id}").json()["status"] == "screening"

    history = client.get(f"/applications/{app_id}/history").json()
    assert sorted(h["to_status"] for h in history) == ["applied", "saved", "screening"]


def test_filter_applications(client: TestClient) -> None:
    company = make_company(client)
    backend = make_application(client, company["id"])
    devops = make_application(
        client, company["id"], title="Junior DevOps Engineer", position_type="devops"
    )
    client.post(f"/applications/{backend['id']}/status", json={"to_status": "applied"})

    applied = client.get("/applications", params={"status": "applied"}).json()
    assert [a["id"] for a in applied] == [backend["id"]]

    devops_only = client.get("/applications", params={"position_type": "devops"}).json()
    assert [a["id"] for a in devops_only] == [devops["id"]]


def test_invalid_salary_range_returns_422(client: TestClient) -> None:
    company = make_company(client)
    response = client.post(
        "/applications",
        json={
            "company_id": company["id"],
            "title": "Junior Backend Engineer",
            "position_type": "backend",
            "source": "linkedin",
            "salary_min": 20000,
            "salary_max": 10000,
        },
    )
    assert response.status_code == 422


def test_cannot_delete_company_with_applications(client: TestClient) -> None:
    company = make_company(client)
    make_application(client, company["id"])
    response = client.delete(f"/companies/{company['id']}")
    assert response.status_code == 409


def test_deleting_application_removes_it(client: TestClient) -> None:
    company = make_company(client)
    app_id = make_application(client, company["id"])["id"]
    assert client.delete(f"/applications/{app_id}").status_code == 204
    assert client.get(f"/applications/{app_id}").status_code == 404


def test_duplicate_job_url_returns_409(client: TestClient) -> None:
    company = make_company(client)
    url = "https://jobs.example/1"
    make_application(client, company["id"], job_url=url)

    payload = {
        "company_id": company["id"],
        "title": "Same job again",
        "position_type": "backend",
        "source": "linkedin",
        "job_url": url,
    }
    assert client.post("/applications", json=payload).status_code == 409

    other = make_application(client, company["id"])
    response = client.patch(f"/applications/{other['id']}", json={"job_url": url})
    assert response.status_code == 409


def import_item(job_url: str, **overrides) -> dict:
    item = {
        "company": "WeDev Technologies",
        "title": "Junior Fullstack Software Developer",
        "position_type": "fullstack",
        "level": "junior",
        "employment_type": "full_time",
        "work_mode": None,
        "city": None,
        "job_url": job_url,
        "source": "company_site",
        "skills": ["react", "node.js", "mongodb", "sql"],
        "notes": "Fit: Good. CV: FullStack.",
    }
    item.update(overrides)
    return item


def import_items(client: TestClient, items: list[dict]) -> dict:
    response = client.post("/applications/import", json=items)
    assert response.status_code == 200, response.text
    return response.json()


def test_import_creates_companies_and_applications(client: TestClient) -> None:
    items = [
        import_item("https://jobs.example/1"),
        import_item(
            "https://jobs.example/2",
            company="Unknown (via jobify360 – high-tech company)",
            work_mode="onsite",
            city="Holon",
        ),
    ]
    result = import_items(client, items)
    assert result == {
        "created": 2,
        "updated": 0,
        "skipped": 0,
        "updated_urls": [],
        "skipped_urls": [],
    }

    companies = client.get("/companies").json()
    assert [c["name"] for c in companies] == [
        "Unknown (via jobify360 – high-tech company)",
        "WeDev Technologies",
    ]
    applications = client.get("/applications").json()
    assert len(applications) == 2
    assert all(a["status"] == "saved" and a["applied_at"] is None for a in applications)


def test_reimporting_same_file_creates_nothing(client: TestClient) -> None:
    urls = ["https://jobs.example/1", "https://jobs.example/2"]
    items = [import_item(url) for url in urls]
    import_items(client, items)

    result = import_items(client, items)
    assert result == {
        "created": 0,
        "updated": 0,
        "skipped": 2,
        "updated_urls": [],
        "skipped_urls": urls,
    }
    assert len(client.get("/applications").json()) == 2


def test_duplicate_url_in_same_file_is_created_once(client: TestClient) -> None:
    url = "https://jobs.example/1"
    result = import_items(client, [import_item(url), import_item(url, title="Posted twice")])
    assert result == {
        "created": 1,
        "updated": 0,
        "skipped": 1,
        "updated_urls": [],
        "skipped_urls": [url],
    }
    assert len(client.get("/applications").json()) == 1


def test_import_reuses_existing_company(client: TestClient) -> None:
    company = make_company(client, "WeDev Technologies")
    import_items(
        client, [import_item("https://jobs.example/1"), import_item("https://jobs.example/2")]
    )

    assert [c["id"] for c in client.get("/companies").json()] == [company["id"]]
    applications = client.get("/applications").json()
    assert {a["company_id"] for a in applications} == {company["id"]}


def test_import_applied_item_uses_status_rules(client: TestClient) -> None:
    item = import_item(
        "https://jobs.example/1", status="applied", applied_at="2026-10-15T09:30:00Z"
    )
    import_items(client, [item])

    application = client.get("/applications").json()[0]
    assert application["status"] == "applied"
    assert datetime.fromisoformat(application["applied_at"]) == datetime(
        2026, 10, 15, 9, 30, tzinfo=UTC
    )
    history = client.get(f"/applications/{application['id']}/history").json()
    assert [(h["from_status"], h["to_status"]) for h in history] == [
        (None, "saved"),
        ("saved", "applied"),
    ]


def test_import_applied_without_date_uses_now(client: TestClient) -> None:
    import_items(client, [import_item("https://jobs.example/1", status="applied")])

    applied_at = datetime.fromisoformat(client.get("/applications").json()[0]["applied_at"])
    assert datetime.now(UTC) - applied_at < timedelta(minutes=1)


@pytest.mark.parametrize(
    ("field", "value"),
    [("position_type", "wizard"), ("source", "carrier_pigeon"), ("status", "rejected")],
)
def test_import_invalid_values_return_422(client: TestClient, field: str, value: str) -> None:
    item = import_item("https://jobs.example/1", **{field: value})
    response = client.post("/applications/import", json=[item])
    assert response.status_code == 422
    assert client.get("/applications").json() == []


def test_import_applied_at_requires_applied_status(client: TestClient) -> None:
    item = import_item("https://jobs.example/1", applied_at="2026-10-15T09:30:00Z")
    response = client.post("/applications/import", json=[item])
    assert response.status_code == 422


def test_failed_import_saves_nothing(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    def failing_change_status(*args, **kwargs):
        raise InvalidTransitionError(Status.SAVED, Status.APPLIED)

    monkeypatch.setattr(services, "change_status", failing_change_status)
    items = [
        import_item("https://jobs.example/1"),
        import_item("https://jobs.example/2", company="Other Co", status="applied"),
    ]
    response = client.post("/applications/import", json=items)
    assert response.status_code == 409
    assert client.get("/applications").json() == []
    assert client.get("/companies").json() == []


def test_applied_item_updates_saved_application(client: TestClient) -> None:
    url = "https://jobs.example/1"
    import_items(client, [import_item(url)])

    # Applied after it was saved. A fixed past date would sort "applied" before "saved"
    # in the database, while the session cache keeps insertion order: a flaky test.
    applied_at = datetime.now(UTC) + timedelta(hours=1)
    applied = import_item(url, status="applied", applied_at=applied_at.isoformat())
    result = import_items(client, [applied])
    assert result == {
        "created": 0,
        "updated": 1,
        "skipped": 0,
        "updated_urls": [url],
        "skipped_urls": [],
    }

    [application] = client.get("/applications").json()
    assert application["status"] == "applied"
    assert datetime.fromisoformat(application["applied_at"]) == applied_at
    history = client.get(f"/applications/{application['id']}/history").json()
    assert [(h["from_status"], h["to_status"]) for h in history] == [
        (None, "saved"),
        ("saved", "applied"),
    ]


@pytest.mark.parametrize(
    ("moves", "expected_status"),
    [([], "applied"), (["screening"], "screening"), (["rejected"], "rejected")],
)
def test_applied_item_only_updates_saved_applications(
    client: TestClient, moves: list[str], expected_status: str
) -> None:
    url = "https://jobs.example/1"
    import_items(client, [import_item(url, status="applied")])
    app_id = client.get("/applications").json()[0]["id"]
    for status in moves:
        response = client.post(f"/applications/{app_id}/status", json={"to_status": status})
        assert response.status_code == 201
    history_before = client.get(f"/applications/{app_id}/history").json()

    result = import_items(client, [import_item(url, status="applied")])

    assert result["updated"] == 0
    assert result["skipped_urls"] == [url]
    assert client.get(f"/applications/{app_id}").json()["status"] == expected_status
    assert client.get(f"/applications/{app_id}/history").json() == history_before


def test_applied_duplicate_later_in_same_file_is_skipped(client: TestClient) -> None:
    url = "https://jobs.example/1"
    result = import_items(client, [import_item(url), import_item(url, status="applied")])

    assert (result["created"], result["updated"], result["skipped_urls"]) == (1, 0, [url])
    assert client.get("/applications").json()[0]["status"] == "saved"


def test_filter_applications_by_job_url(client: TestClient) -> None:
    company = make_company(client)
    url = "https://jobs.example/1?ref=board&lang=en"
    target = make_application(client, company["id"], job_url=url)
    make_application(client, company["id"], job_url="https://jobs.example/2")
    make_application(client, company["id"])

    found = client.get("/applications", params={"job_url": url}).json()
    assert [a["id"] for a in found] == [target["id"]]
    missing = client.get("/applications", params={"job_url": "https://jobs.example/nope"})
    assert missing.json() == []


def test_mark_applied_by_job_url(client: TestClient) -> None:
    """The API calls behind `make applied`: look up by job_url, then change the status."""
    url = "https://jobs.example/1"
    import_items(client, [import_item(url)])

    [application] = client.get("/applications", params={"job_url": url}).json()
    status_url = f"/applications/{application['id']}/status"
    response = client.post(
        status_url, json={"to_status": "applied", "changed_at": "2026-10-19T12:00:00+0300"}
    )
    assert response.status_code == 201

    updated = client.get(f"/applications/{application['id']}").json()
    assert updated["status"] == "applied"
    assert datetime.fromisoformat(updated["applied_at"]) == datetime(2026, 10, 19, 9, tzinfo=UTC)
    assert client.post(status_url, json={"to_status": "applied"}).status_code == 409
