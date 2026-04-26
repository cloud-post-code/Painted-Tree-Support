from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_liveness() -> dict:
    """Process is up. Used by Railway/nginx — must not depend on Postgres (DB may still be attaching)."""
    return {"status": "ok", "version": "0.1.0"}


@router.get("/health/ready")
async def health_ready(db: AsyncSession = Depends(get_db)) -> dict:
    """Returns 503 if the database is not reachable (for operators / advanced load balancers)."""
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(status_code=503, detail="database unavailable") from None
    return {"status": "ready", "db": "ok"}
