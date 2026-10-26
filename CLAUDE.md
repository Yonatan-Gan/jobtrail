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
- **Done:** Dockerfiles (backend, frontend with nginx), docker-compose stack (db, migrate, api, web), GitHub Actions CI (backend + frontend). **Planned:** Terraform on AWS

## Repo layout

```
jobtrail/
├── .github/workflows/ci.yml CI: backend (ruff + pytest with a Postgres service), frontend (format, lint, typecheck, test, build) → backend image to GHCR on main
├── docker-compose.yml        "db" (Postgres 16, volume pgdata) → one-shot "migrate" → "api" (:8000) → "web" (nginx, :8080); env VITE_API_URL, CORS_ORIGINS
├── screenshots/              README screenshots (fake sample data)
├── Makefile                  `make import` → scripts/import_latest.sh, `make applied URL=… [DATE=…]` → scripts/mark_applied.sh
├── scripts/
│   ├── import_latest.sh      posts the newest ~/Downloads/jobtrail_{import,applied}_*.json to /applications/import
│   ├── mark_applied.sh       finds an application by job_url (GET /applications?job_url=) and moves it to applied
│   └── lib.sh                shared helpers (api_url, require_api, require_jq, print_api_error); sourced, not run
├── README.md
├── frontend/                 React + TypeScript (Vite); see frontend/README.md
│   ├── package.json          scripts: dev, build, lint, typecheck, test, format:check, gen:api
│   ├── .env.development      VITE_API_URL for `npm run dev` (.env.test for Vitest)
│   ├── Dockerfile            multi-stage: Node build → nginx-unprivileged (uid 101, :8080); VITE_API_URL build arg
│   ├── nginx.conf            SPA fallback to index.html, immutable caching for /assets, no-cache index.html, gzip
│   └── src/
│       ├── api/              schema.ts (generated with --enum-values, don't edit), types.ts, client.ts (request, ApiError),
│       │                     endpoints.ts (api.*), queries.ts (queryKeys, useX hooks, useRefreshApplications), queryClient.ts
│       ├── pages/            ApplicationsPage (home), ApplicationDetailPage, NewApplicationPage, ImportPage, CompaniesPage,
│       │                     DashboardPage, NotFoundPage
│       ├── components/       Layout (nav, skip link, focus/scroll on navigation), Dialog (native <dialog>), ConfirmDialog,
│       │                     FormFields, Button, badges, Notice, QueryStates; folders applications/, companies/,
│       │                     importing/, dashboard/
│       ├── lib/              plain functions: listFilters (URL ↔ filters), applicationForm/companyForm (form ↔ API),
│       │                     apiErrors (FieldErrors, formErrors), duplicateJobUrl, importFile, fit, format, dates, status
│       └── test/             setup.ts (dialog stand-in, fetch guard, TZ), render.tsx, fixtures.ts, mockApi.ts
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

`docker compose up --build` runs the whole stack: db → migrate → api on :8000 → web (nginx) on http://localhost:8080. Stop any local uvicorn first, because both use port 8000. `VITE_API_URL` (build arg, default http://localhost:8000) and `CORS_ORIGINS` (JSON list, default 8080 + 5173) come from the environment; a new `VITE_API_URL` needs `--build`.

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

`npm run dev` serves http://localhost:5173 and calls the API at `VITE_API_URL` (http://localhost:8000). `npm run gen:api` regenerates `src/api/schema.ts` (types + enum value arrays) from the running API; do it after changing backend schemas.

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
- **Status changes can't be dated before the latest one** (`check_not_before_latest` in services.py): the API answers 422 with `loc ["body", "changed_at"]`, so the history stays in order. Ties go to the row added last.
- **Status changes can't be dated in the future:** more than `FUTURE_TOLERANCE` (5 minutes, for clock differences) ahead of the server's clock is a Pydantic 422 (`NotFutureUtcDatetime` in schemas.py) on `changed_at`, or on `applied_at` for import items (`loc ["body", N, "applied_at"]`). `make applied DATE=…` gets the same error.
- **Backdating:** the one exception to "not before the latest change": moving to `applied` with a time earlier than the `saved` row moves the saved row back to that time, so history never shows applied before saved.
- **Rules that need the database** answer 422 in FastAPI's own shape via `field_error()` in routers/applications.py, so the frontend shows them next to the field like any validation error.
- **Salary range:** `salary_min <= salary_max` is a Pydantic `field_validator` on `salary_max` (create and PATCH, 422 on `salary_max`, message "salary_min must be less than or equal to salary_max"). A PATCH with only one salary is compared with the stored other one in the router (422 on the field that was sent). The DB CHECK stays as the last line of defence.
- **Input datetimes without a time zone are read as UTC** (`UtcDatetime` in schemas.py). Postgres runs in UTC, and aware datetimes can be compared safely.
- **CORS** origins come from settings (`CORS_ORIGINS`), never hard-coded. Status rules reach the frontend through `GET /meta/status-transitions`; the frontend must not copy them.

### Frontend conventions

- **Types come from the backend:** `npm run gen:api` → `src/api/schema.ts`; `types.ts` only renames. Dropdown options use the generated value arrays (`statusValues`, …). "Final" statuses are derived from `/meta/status-transitions` (no allowed moves), never hard-coded.
- **One HTTP layer:** pages call `api.*` (endpoints.ts) through TanStack Query; reads use the hooks in `queries.ts`. Query keys start with the resource (`["applications", …]`), so after a change `useRefreshApplications()` invalidates lists, details, history and stats in one go.
- **Mutations** use `useMutation`; errors become field messages with `formErrors()` (422 `loc` → field; `FieldErrors` for client checks, duplicate job URL and taken company names) and appear next to the field.
- **PATCH sends only changed fields** (`buildUpdatePayload`, `companyUpdatePayload`): both sides go through the same parse, so cosmetic differences don't count.
- **List filters live in the URL** (`listFilters.ts`): status/type/company go to the API, "not final"/fit/search are filtered in the browser. Defaults are left out of the URL.
- **Dialogs** use the native `<dialog>` via `components/Dialog.tsx` (showModal, Esc via `cancel`, Tab wraps, focus returns to the opener). Route changes scroll to the top and focus `<main>` (Layout).
- **Every page** has loading, empty and error states (`QueryStates.tsx`); colour is never the only signal (badges have text); fields are labelled and errors linked with `aria-describedby`.
- **Tests** mock the API client with `mockApi()` (`vi.spyOn(api, …)`); `setup.ts` makes any real `fetch` fail, fixes TZ to UTC and stands in for `<dialog>` methods jsdom lacks.

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
- Frontend phase 1: Vite scaffold, Tailwind, ESLint/Prettier, Vitest; typed API client with types generated from OpenAPI; React Router layout with navigation
- Frontend app (branch `frontend-app`, 2026-10-25): applications list (home, URL filters, fit badges, sorting, phone layout), application detail (edit with PATCH of changed fields, status buttons from `/meta/status-transitions` with note/date dialog, Mark applied, history timeline, delete), import page (preview, result, per-job 422 messages), add application (inline company creation, duplicate-URL link), companies page (counts, edit, explained RESTRICT deletes), dashboard (stat tiles + accessible funnel chart, no chart library)
- Frontend Dockerfile (Node build → nginx-unprivileged) and `web` compose service; CI frontend job
- Checked end to end in headless Chrome against a throwaway database (`jobtrail_dev_check`, since dropped) and in an isolated compose project
- Validation fixes (branch `fix/status-dates-and-salary`): status changes can't be dated before the latest one (422 on `changed_at`, shown next to the date in the status dialog; the dialog turns "today" into now and never goes before the latest change on the same day), and a clear field-level 422 for `salary_min > salary_max` on create and PATCH
- Future dates refused (branch `fix/no-future-status-dates`): 422 for a status change or import `applied_at` more than 5 minutes ahead, shown next to the date in the status dialog and printed by `make applied`
- Tests: backend 85 (pytest), frontend 93 (Vitest)

**Not done yet** (don't claim these)
- No API or UI for contacts / application_contacts (the tables exist, no endpoints)
- No auth, no deployment (AWS/Terraform), no pagination
- The frontend image isn't built or published by CI (only checked locally); `VITE_API_URL` is baked in at build time
- No dark mode; no "needs attention" list (applications with no change for 14+ days)

**Next**
- Merge `frontend-app` into `main` and push; watch the first CI run with the frontend job
- Then Terraform on AWS

**Roadmap**
- nginx reverse proxy: serve the API under `/api` from the `web` container and build the frontend with `VITE_API_URL=/api`. One frontend image then works in every environment (no API address baked in) and the browser sees one origin, so CORS is no longer needed
- Publish the frontend image from CI to GHCR (like the backend image), once it no longer depends on the API address
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
- Frontend tests (Vitest + Testing Library, jsdom) mock the API client with `mockApi()`; `src/test/render.tsx` renders a page at a route (`route`, `path`) with the query client and a MemoryRouter, and exposes the current URL as `getByTestId("location")`.
- Manual or browser checks must never touch the real `jobtrail` database: use a throwaway database (e.g. `createdb jobtrail_dev_check`, run the API with `DATABASE_URL=…/jobtrail_dev_check` on a spare port) or an isolated compose project (`docker compose -p jobtrail-smoke …`, then `down -v`).
- Before committing: `uv run ruff format .`, `uv run ruff check .`, `uv run pytest`; in `frontend/`: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`

## Known gotchas

- zsh treats `#` in pasted commands as text unless `setopt interactivecomments` is set. Avoid inline comments in commands.
- `--reload` without `--reload-dir app` restarts endlessly because it watches `.venv`.
- Alembic-generated migrations fail ruff, so `migrations/versions` is excluded in pyproject.toml. Always **read** generated migrations before applying them.
- The pytest warning about `httpx` in Starlette's TestClient is a known library deprecation, not a bug in this repo.
- The repo lives in iCloud-synced `~/Desktop`. When the disk fills up, macOS evicts file contents (`ls -lO` shows `dataless`) and imports, pytest and Docker hang. Free space, then read the files once to download them.
- `~/.npm` contained root-owned files (EACCES on `npm install`). Fix once with `sudo chown -R 501:20 ~/.npm`.
- `openapi-typescript` 7 declares a TypeScript 5 peer, so `gen:api` runs it through `npx` instead of installing it next to TypeScript 6.
- Headless Chrome on this Mac renders pages but exits slowly; run it in the background with a separate `--user-data-dir`. For clicking through flows, `playwright-core` driving the installed Chrome (`executablePath`) works without downloading a browser.
- jsdom (29) has no `HTMLDialogElement.showModal()/close()`; `src/test/setup.ts` adds a small stand-in. Real browsers are covered by the Chrome checks.
- openapi-typescript treats fields with a default as required, so `ApplicationCreate.level` / `employment_type` must always be sent.
- Building the compose stack under another project name still tags `jobtrail-frontend:latest`. An image built with a test `VITE_API_URL` would then be reused by a plain `docker compose up`; remove it or use `--build`.
