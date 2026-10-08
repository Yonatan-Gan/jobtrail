# CLAUDE.md – JobTrail

Context for Claude Code working in this repository.

## Who I am and how to work with me

- I'm Yonatan, a new CS graduate (Hebrew University, 2026) looking for junior Backend / DevOps / Full Stack roles in Israel.
- JobTrail is my **portfolio project**. I'll be asked about every line in interviews, so I need to **understand** the code, not just have it.
- **Work in small steps.** Before you change anything, say what you'll change and why. After you change it, explain the important lines in plain language.
- Explain the *why* behind design decisions (trade-offs, alternatives), not only the *what*.
- Prefer clear, conventional code over clever code.
- Give terminal commands **without inline `#` comments** (zsh on macOS), one block at a time.
- Don't commit or push unless I ask. Suggest a commit message using Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`).
- I'm learning Python idioms. If you see me using a non-idiomatic pattern, point it out briefly.

## What JobTrail is

A job-search management app that I use for my own job hunt: tracks applications, companies, contacts and every status change, and computes stats (response rate, days to first reply, funnel by stage).

The project is also meant to **show DevOps skills**: containerization, CI/CD, infrastructure as code and cloud deployment.

## Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0 (typed `Mapped[...]` style), Alembic, pydantic-settings, psycopg 3
- **Database:** PostgreSQL 16 (Docker Compose for local dev)
- **Tooling:** `uv` (package manager), pytest + httpx, ruff (line length 100)
- **Planned:** React + TypeScript frontend, Dockerfile, GitHub Actions CI/CD, Terraform on AWS

## Repo layout

```
jobtrail/
├── docker-compose.yml        Postgres 16 service "db" (user/pass/db: jobtrail), volume pgdata
├── README.md
└── backend/
    ├── pyproject.toml        deps, pytest pythonpath=["."], ruff config (excludes migrations/versions)
    ├── uv.lock
    ├── .env                  DATABASE_URL (git-ignored); .env.example is committed
    ├── alembic.ini
    ├── migrations/           env.py reads settings.database_url and Base.metadata
    ├── app/
    │   ├── main.py           FastAPI app, /health, includes routers
    │   ├── config.py         Settings (pydantic-settings), settings.database_url
    │   ├── db.py             engine, SessionLocal, Base (with naming convention), get_db, DbSession
    │   ├── enums.py          StrEnums: Status, PositionType, Level, EmploymentType, WorkMode, Source, ContactRole
    │   ├── models.py         SQLAlchemy models (see Data model)
    │   ├── schemas.py        Pydantic schemas (Create / Update / Read per resource)
    │   └── routers/
    │       └── companies.py  CRUD for /companies
    └── tests/
        └── test_health.py
```

## Commands

Run `uv` commands from `backend/`. Run `git` and `docker compose` from the repo root.

```bash
docker compose up -d db
docker compose ps
docker compose exec db psql -U jobtrail -c '\dt'
```

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --reload-dir app
uv run pytest
uv run ruff check .
uv run alembic revision --autogenerate -m "message"
uv run alembic upgrade head
```

Always run `ruff check .` and `pytest` before committing.

## Data model

Five tables. `applications` stores the **current state**; `status_changes` stores the **full history**.

- **companies:** id, name (unique), website, notes, created_at
- **applications:** id, company_id (FK, ON DELETE RESTRICT), title, position_type, level (default junior), employment_type (default full_time), work_mode, city, salary_min / salary_max (NIS monthly, CHECK min <= max), job_url, source, skills (Postgres `ARRAY(String)` with GIN index), status (default saved, indexed), applied_at, notes, created_at, updated_at
- **status_changes:** id, application_id (FK, ON DELETE CASCADE), from_status (nullable), to_status, changed_at (default now, can be backdated), note. Index on (application_id, changed_at)
- **contacts:** id, company_id (FK, nullable, ON DELETE SET NULL), name, title, email, phone, linkedin_url, notes, created_at
- **application_contacts:** junction table, composite PK (application_id, contact_id), role (recruiter / referrer / hiring_manager / interviewer / other). Both FKs ON DELETE CASCADE

### Conventions

- **Enums** are Python `StrEnum`s stored as VARCHAR (`native_enum=False`) via the `enum_column()` helper in models.py, so adding a value needs no DB migration.
- **Timestamps** are `DateTime(timezone=True)` (UTC).
- **Constraint names** come from the naming convention on `Base.metadata`.
- **Business rules live in Python** (e.g. status transitions), not in the database.
- Endpoints use `db: DbSession` (an `Annotated[Session, Depends(get_db)]` alias from db.py).
- DB constraint violations (`IntegrityError`) are caught, rolled back and turned into HTTP **409**. Missing rows → **404**. Pydantic handles **422**.
- `PATCH` uses `model_dump(exclude_unset=True)` so only sent fields change.

### Status flow

Active: `saved → applied → screening → assignment → technical → final → offer`.
Endings: `rejected`, `withdrawn`, `ghosted`, `accepted`, `declined`.

| From | Allowed next |
|---|---|
| saved | applied, withdrawn |
| applied | screening, assignment, technical, rejected, ghosted, withdrawn |
| screening | assignment, technical, final, rejected, ghosted, withdrawn |
| assignment | technical, final, rejected, ghosted, withdrawn |
| technical | technical, final, offer, rejected, ghosted, withdrawn |
| final | offer, rejected, ghosted, withdrawn |
| offer | accepted, declined |
| ghosted | screening, assignment, technical, final, rejected |
| rejected, withdrawn, accepted, declined | (none – final) |

**Key rule:** status is stored twice (current on `applications`, history in `status_changes`). Only **one service function** may change a status. In a single transaction it must: validate the move, update `applications.status` (and `applied_at` when moving to applied), and insert a `status_changes` row.

## Progress

**Done**
- FastAPI scaffold, `/health` endpoint and test
- Docker Compose Postgres
- Data model, first Alembic migration applied (6 tables incl. alembic_version)
- Company schemas and CRUD endpoints (`/companies`)

**In progress (week 1)**
- `app/status_rules.py`: `ALLOWED_TRANSITIONS` dict + `can_transition()`. **I'm writing this one myself**, review it but don't write it for me.
- Application schemas and CRUD endpoints, with filtering (status, company, position_type)
- Status-change service function + endpoint (e.g. `POST /applications/{id}/status`)
- Tests against a separate Postgres test database
- `/stats` endpoint (response rate, days to first response, funnel)

**Roadmap**
- Week 2: Dockerfile (multi-stage, non-root), docker-compose for the full stack, GitHub Actions CI (ruff → pytest → build → push image)
- Weeks 3–4: Terraform on AWS (VPC, ECS Fargate, RDS, ECR), CD on merge, GitHub OIDC (no long-lived keys), users/auth before deploying
- Later: Kubernetes (kind/k3s locally), Prometheus/Grafana, Trivy + Dependabot, React dashboard

## Known gotchas

- zsh treats `#` in pasted commands as text unless `setopt interactivecomments` is set. Avoid inline comments in commands.
- `--reload` without `--reload-dir app` restarts endlessly because it watches `.venv`.
- Alembic-generated migrations fail ruff, so `migrations/versions` is excluded in pyproject.toml. Always **read** generated migrations before applying them.
- The pytest warning about `httpx` in Starlette's TestClient is a known library deprecation, not a bug in this repo.
