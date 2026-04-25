import hashlib

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.download import DownloadLog

router = APIRouter(prefix="/downloads", tags=["downloads"])


class DownloadLogBody(BaseModel):
    slug: str = Field(max_length=255)


@router.post("/log")
async def log_download(
    body: DownloadLogBody,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    ip = request.client.host if request.client else ""
    ua = request.headers.get("user-agent", "")
    ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:32] if ip else None
    ua_hash = hashlib.sha256(ua.encode()).hexdigest()[:32] if ua else None
    db.add(DownloadLog(slug=body.slug, ip_hash=ip_hash, user_agent_hash=ua_hash))
    await db.commit()
    return {"ok": True}
