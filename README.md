# JobTrail

Job-search management API: track companies, applications, contacts and every status change, with rules for which status changes are allowed and a full history of each application.

**Stack:** Python 3.12 · FastAPI · PostgreSQL · SQLAlchemy 2.0 · Alembic · pytest · Docker
**Planned:** React dashboard · GitHub Actions CI/CD · Terraform · AWS

## Features

- **Companies and applications:** create, read, update and delete, with filters by status, company and position type
- **Status flow with rules:** `saved → applied → screening → assignment → technical → final → offer`, plus `rejected`, `withdrawn`, `ghosted`, `accepted` and `declined`. Moves that aren't allowed (e.g. `applied → offer`) are rejected with `409 Conflict`
- **Full history:** every status change is stored with a timestamp and an optional note
- **Stats:** response rate, average days to first response and a funnel by stage, all computed from the status history
- **Validation:** request data is checked by Pydantic (`422`), and the database enforces unique company names, foreign keys and a salary-range check

## Design

- **Current status + history.** `applications.status` holds the current state for fast filtering, and `status_changes` holds the full history for stats. A single service function (`change_status`) validates the move and updates both in one transaction, so they can never get out of sync.
- **Business rules in Python.** The allowed moves live in `app/status_rules.py` and are covered by unit tests.
- **Migrations with Alembic.** Database changes are versioned in `backend/migrations/`.

## API

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` / `GET` | `/companies` | Create / list companies |
| `GET` / `PATCH` / `DELETE` | `/companies/{id}` | Read / update / delete a company |
| `POST` / `GET` | `/applications` | Create / list applications (`?status=`, `?company_id=`, `?position_type=`) |
| `GET` / `PATCH` / `DELETE` | `/applications/{id}` | Read / update / delete an application |
| `POST` | `/applications/{id}/status` | Change status (validated) |
| `GET` | `/applications/{id}/history` | Status history |
| `GET` | `/stats` | Response rate, average days to first response, funnel by stage |

Interactive docs: http://localhost:8000/docs

## Run locally

Requirements: [uv](https://docs.astral.sh/uv/) and Docker.

```bash
docker compose up -d db
cd backend
cp .env.example .env
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --reload-dir app
```

## Run the full stack with Docker

```bash
docker compose up --build
```

This starts three services in order: `db` (Postgres), `migrate` (runs `alembic upgrade head` once and exits) and `api` (the backend image, on http://localhost:8000). Stop a local `uvicorn` first, because both use port 8000.

The image is built in two stages (dependencies installed with uv in a builder stage, then only the virtualenv and the code copied into a slim runtime stage) and runs as a non-root user.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every pull request and every push to `main`:

1. **Lint and test:** `ruff format --check`, `ruff check` and `pytest` against a Postgres service container.
2. **Build image:** builds the Docker image. On pushes to `main` it also pushes it to GitHub Container Registry, tagged with the commit SHA and `latest`.

## Tests

API tests run against a separate `jobtrail_test` database. Each test runs inside a transaction that is rolled back afterwards, so tests never affect each other or your real data.

One-time setup:

```bash
docker compose exec db createdb -U jobtrail jobtrail_test
```

Run:

```bash
cd backend
uv run pytest -v
uv run ruff format --check .
uv run ruff check .
```
