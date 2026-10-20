from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import applications, companies, meta, stats

app = FastAPI(title="JobTrail API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(companies.router)
app.include_router(applications.router)
app.include_router(stats.router)
app.include_router(meta.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
