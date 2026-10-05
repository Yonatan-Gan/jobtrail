from fastapi import FastAPI

app = FastAPI(title="JobTrail API")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
