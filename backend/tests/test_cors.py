import pytest
from fastapi.testclient import TestClient

from app.config import Settings, settings
from app.main import app

client = TestClient(app)
ALLOWED_ORIGIN = settings.cors_origins[0]


def test_allowed_origin_gets_cors_header() -> None:
    response = client.get("/health", headers={"Origin": ALLOWED_ORIGIN})
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN


def test_preflight_for_json_post_is_allowed() -> None:
    response = client.options(
        "/applications",
        headers={
            "Origin": ALLOWED_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN


def test_other_origins_get_no_cors_header() -> None:
    response = client.get("/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in response.headers


def test_cors_origins_come_from_the_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", '["https://jobtrail.example.com", "http://localhost:4173"]')
    assert Settings(_env_file=None).cors_origins == [
        "https://jobtrail.example.com",
        "http://localhost:4173",
    ]
