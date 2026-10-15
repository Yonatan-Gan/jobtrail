from fastapi import APIRouter

from app.db import DbSession
from app.schemas import StatsRead
from app.stats import get_stats

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=StatsRead)
def read_stats(db: DbSession) -> StatsRead:
    return get_stats(db)
