from fastapi import FastAPI

from app.routers import applications, companies

app = FastAPI(title="JobTrail API")
app.include_router(companies.router)
app.include_router(applications.router)    

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
