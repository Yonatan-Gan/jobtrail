from fastapi.testclient import TestClient


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
