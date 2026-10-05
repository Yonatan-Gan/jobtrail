# JobTrail

Job-search management dashboard: track applications, contacts and interview stages.

**Stack:** FastAPI · PostgreSQL · React · Docker · GitHub Actions · Terraform · AWS

## Run locally

Requirements: [uv](https://docs.astral.sh/uv/) and Docker.

```bash
docker compose up -d db
cd backend
uv sync
uv run uvicorn app.main:app --reload --reload-dir app
uv run pytest
```

API docs: http://localhost:8000/docs