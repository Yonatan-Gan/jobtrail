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
- **Frontend:** React 19 + TypeScript 6 with Vite 8, TanStack Query 5, React Router 7, Tailwind CSS 4, Vitest 5 + Testing Library (jsdom 29), ESLint + Prettier. Node 22.13+ (React Router 8 / jsdom 30 would need Node 22.22+)
- **Done:** Dockerfile, docker-compose stack, GitHub Actions CI (backend). **Planned:** frontend phases 2–5, Terraform on AWS

## Repo layout

```
jobtrail/
├── .github/workflows/ci.yml CI: ruff + pytest (Postgres service) → build image, push to GHCR on main
├── docker-compose.yml        Postgres 16 "db" (user/pass/db: jobtrail, volume pgdata), one-shot "migrate", and "api"
├── Makefile                  `make import` → scripts/import_latest.sh, `make applied URL=… [DATE=…]` → scripts/mark_applied.sh
├── scripts/
│   ├── import_latest.sh      posts the newest ~/Downloads/jobtrail_{import,applied}_*.json to /applications/import
│   ├── mark_applied.sh       finds an application by job_url (GET /applications?job_url=) and moves it to applied
│   └── lib.sh                shared helpers (api_url, require_api, require_jq, print_api_error); sourced, not run
├── README.md
├── frontend/                 React + TypeScript (Vite); see frontend/README.md
│   ├── package.json          scripts: dev, build, lint, typecheck, test, format:check, gen:api
│   ├── .env.development      VITE_API_URL for `npm run dev` (.env.test for Vitest)
│   └── src/
│       ├── api/              schema.d.ts (generated, don't edit), types.ts, client.ts (request, ApiError), endpoints.ts, queryClient.ts
│       ├── components/       Layout (nav, skip link), PageHeader (<title>), ApiStatus
│       ├── pages/            Dashboard, Applications, Companies, Import (placeholders), NotFound
│       └── test/             setup.ts, render.tsx (renderWithProviders)
└── backend/
    ├── Dockerfile            multi-stage (uv builder → slim runtime), non-root user, read-only code
    ├── .dockerignore         keeps .venv, .env, caches and tests out of the build
    ├── pyproject.toml        deps, pytest pythonpath=["."], ruff config (excludes migrations/versions)
    ├── uv.lock
    ├── .env                  DATABASE_URL (git-ignored); .env.example is committed
    ├── alembic.ini
    ├── migrations/           env.py reads settings.database_url and Base.metadata
    ├── app/
    │   ├── main.py           FastAPI app, /health, includes routers
    │   ├── config.py         Settings (pydantic-settings): database_url, cors_origins (env CORS_ORIGINS, JSON list)
    │   ├── db.py             engine, SessionLocal, Base (with naming convention), get_db, DbSession
    │   ├── enums.py          StrEnums: Status, PositionType, Level, EmploymentType, WorkMode, Source, ContactRole
    │   ├── models.py         SQLAlchemy models (see Data model)
    │   ├── schemas.py        Pydantic schemas (Create / Update / Read per resource)
    │   ├── status_rules.py   ALLOWED_TRANSITIONS + can_transition()
    │   ├── services.py       change_status() (the only place a status changes), get_status_history(), new_application(), import_applications(); never commit
    │   ├── stats.py          read-only stats queries over status_changes, get_stats()
    │   └── routers/
    │       ├── companies.py      CRUD for /companies
    │       ├── applications.py   CRUD, filters, status changes and history for /applications
    │       ├── stats.py          GET /stats
    │       └── meta.py           GET /meta/status-transitions (rules for the frontend)
    └── tests/
        ├── conftest.py       test DB fixtures (db_session, client)
        ├── test_api.py
        ├── test_cors.py
        ├── test_health.py
        ├── test_meta.py
        ├── test_stats.py
        └── test_status_rules.py
```

## Commands

Run `uv` commands from `backend/`. Run `git` and `docker compose` from the repo root.

```bash
docker compose up -d db
docker compose ps
docker compose exec db psql -U jobtrail -c '\dt'
```

`docker compose up --build` runs the whole stack (db → migrate → api on port 8000). Stop any local uvicorn first, because both use port 8000.

`make import` (repo root, API running) imports the newest `jobtrail_import_*.json` / `jobtrail_applied_*.json` from `~/Downloads`. `make applied URL='<job_url>' [DATE=YYYY-MM-DD]` marks one application as applied through the API. Override with `JOBTRAIL_IMPORT_DIR` / `JOBTRAIL_API_URL`. The scripts target macOS (bash 3.2, BSD `date`, `jq`), so no bash 4+ features.

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

```bash
cd frontend
npm install
npm run dev
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run gen:api
```

`npm run dev` serves http://localhost:5173 and calls the API at `VITE_API_URL` (http://localhost:8000). `npm run gen:api` regenerates `src/api/schema.d.ts` from the running API; do it after changing backend schemas.

## Data model

Five tables. `applications` stores the **current state**; `status_changes` stores the **full history**.

- **companies:** id, name (unique), website, notes, created_at
- **applications:** id, company_id (FK, ON DELETE RESTRICT), title, position_type, level (default junior), employment_type (default full_time), work_mode, city, salary_min / salary_max (NIS monthly, CHECK min <= max), job_url (unique index `ix_applications_job_url`; multiple NULLs allowed), source, skills (Postgres `ARRAY(String)` with GIN index), status (default saved, indexed), applied_at, notes, created_at, updated_at
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
- **Service functions never commit.** They change objects in the session; the endpoint commits once, so one request is one transaction. The bulk import relies on this to be all-or-nothing.
- **`job_url` is unique.** A duplicate returns 409 on create and PATCH, and is skipped (not an error) on import, which makes re-importing a file safe. The one exception: an import item with status `applied` moves an existing application that is still `saved` to applied (via `change_status`) and is reported as `updated`.
- **Read history with `get_status_history()`** (explicit `ORDER BY changed_at, id`), never by returning `application.status_changes`: within one session that list keeps insertion order, so the order would depend on the session cache.
- **Backdating:** moving to `applied` with a time earlier than the `saved` row moves the saved row back to that time, so history never shows applied before saved.
- **Input datetimes without a time zone are read as UTC** (`UtcDatetime` in schemas.py). Postgres runs in UTC, and aware datetimes can be compared safely.
- **CORS** origins come from settings (`CORS_ORIGINS`), never hard-coded. Status rules reach the frontend through `GET /meta/status-transitions`; the frontend must not copy them.

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

**Key rule:** status is stored twice (current on `applications`, history in `status_changes`). Only **one service function** (`change_status`) may change a status. In a single transaction it must: validate the move, update `applications.status` (and `applied_at` when moving to applied), and insert a `status_changes` row.

## Progress

**Done**
- FastAPI scaffold, `/health` endpoint and test
- Docker Compose Postgres
- Data model, first Alembic migration applied (6 tables incl. alembic_version)
- Company schemas and CRUD endpoints (`/companies`)
- `app/status_rules.py`: `ALLOWED_TRANSITIONS` + `can_transition()` (written by me), with parametrized tests
- Application schemas and CRUD endpoints (`/applications`) with filters (status, company_id, position_type)
- Status-change service (`app/services.py`, `change_status`) + `POST /applications/{id}/status` and `GET /applications/{id}/history`
- API tests against an isolated Postgres test database (`tests/conftest.py`, `tests/test_api.py`)
- `GET /stats` (`app/stats.py`, `routers/stats.py`): response rate, average days to first response, funnel by stage
- Dockerfile (multi-stage, non-root) + full-stack docker-compose with a one-shot `migrate` service. Verified end to end in an isolated compose project
- GitHub Actions CI (`.github/workflows/ci.yml`): ruff format --check → ruff check → pytest with a Postgres service → build image → push to GHCR on main. First GitHub run (2026-10-17) passed both jobs; the image is public at `ghcr.io/yonatan-gan/jobtrail-backend` (tags `latest`, `sha-<commit>`)
- Bulk import `POST /applications/import` (`import_applications` in `app/services.py`): JSON list of job listings, companies matched by exact name or created, duplicate `job_url`s skipped (in the DB and within the file), optional `status: applied` goes through `change_status`, whole request is one transaction. Second migration `705550c1d083` adds the unique index on `applications.job_url`
- Daily-workflow helpers: `make import` (newest file from ~/Downloads), `make applied URL=… [DATE=…]` (lookup via new `?job_url=` filter on `GET /applications`, then the normal status endpoint). Import now updates `saved` → `applied` for applied items and reports `updated`
- History-order fix: `get_status_history()` always queries `ORDER BY changed_at, id`; backdating moves the saved row back; naive input datetimes are read as UTC
- CORS from settings + `GET /meta/status-transitions`
- Frontend phase 1: Vite scaffold, Tailwind, ESLint/Prettier, Vitest; typed API client with types generated from OpenAPI; React Router layout with navigation and placeholder pages
- Tests: backend 74 (pytest), frontend 15 (Vitest)

**Not done yet** (don't claim these)
- Frontend phases 2–5: applications table/forms/detail page with status buttons, dashboard with charts, import and companies pages, more frontend tests, frontend Dockerfile + compose service, frontend CI job
- No API for contacts / application_contacts (the tables exist, no endpoints)
- No auth, no deployment (AWS/Terraform), no pagination
- The CORS default only covers the Vite dev server

**Next**
- Frontend phase 2: applications (table with filters and search, add form, detail page with PATCH, status buttons from /meta/status-transitions, history timeline)
- Then phases 3–5 (dashboard, import + companies, tests + Docker + CI), then Terraform on AWS

**Roadmap**
- Terraform on AWS (VPC, ECS Fargate, RDS, ECR), CD on merge, GitHub OIDC (no long-lived keys), users/auth before deploying
- Later: Kubernetes (kind/k3s locally), Prometheus/Grafana, Trivy + Dependabot

## Testing

- Unit tests (`test_status_rules.py`, `test_health.py`) need no database.
- API tests use the `client` fixture from `tests/conftest.py`:
  - a separate database `jobtrail_test` (URL from `TEST_DATABASE_URL`, defaults to localhost)
  - tables created once per run from `Base.metadata`
  - each test runs inside a transaction that is rolled back afterwards (`join_transaction_mode="create_savepoint"`), so tests are isolated
  - `app.dependency_overrides[get_db]` swaps in the test session
- One-time setup: `docker compose exec db createdb -U jobtrail jobtrail_test`
- Tests share one session per test, so cached objects survive between requests. To test what a fresh request sees, call `db_session.expire_all()`.
- Frontend tests (Vitest + Testing Library, jsdom) mock `fetch`; `src/test/render.tsx` wraps components in the query client and a MemoryRouter.
- Before committing: `uv run ruff format .`, `uv run ruff check .`, `uv run pytest`; in `frontend/`: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`

## Known gotchas

- zsh treats `#` in pasted commands as text unless `setopt interactivecomments` is set. Avoid inline comments in commands.
- `--reload` without `--reload-dir app` restarts endlessly because it watches `.venv`.
- Alembic-generated migrations fail ruff, so `migrations/versions` is excluded in pyproject.toml. Always **read** generated migrations before applying them.
- The pytest warning about `httpx` in Starlette's TestClient is a known library deprecation, not a bug in this repo.
- The repo lives in iCloud-synced `~/Desktop`. When the disk fills up, macOS evicts file contents (`ls -lO` shows `dataless`) and imports, pytest and Docker hang. Free space, then read the files once to download them.
- `~/.npm` contained root-owned files (EACCES on `npm install`). Fix once with `sudo chown -R 501:20 ~/.npm`.
- `openapi-typescript` 7 declares a TypeScript 5 peer, so `gen:api` runs it through `npx` instead of installing it next to TypeScript 6.
- Headless Chrome on this Mac renders pages but exits slowly; run it in the background with a separate `--user-data-dir`.
