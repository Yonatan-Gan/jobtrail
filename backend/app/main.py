from fastapi import FastAPI

from app.routers import companies

app = FastAPI(title="JobTrail API")
app.include_router(companies.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
