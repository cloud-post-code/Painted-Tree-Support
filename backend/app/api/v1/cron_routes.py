import random
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db
from app.models.vendor import Vendor

router = APIRouter(prefix="/internal/cron", tags=["cron"])


@router.post("/rotate-featured")
async def rotate_featured(
    db: Annotated[AsyncSession, Depends(get_db)],
    x_cron_secret: Annotated[str | None, Header(alias="X-Cron-Secret")] = None,
) -> dict:
    settings = get_settings()
    if not settings.cron_secret or x_cron_secret != settings.cron_secret:
        raise HTTPException(status_code=403, detail="Forbidden")
    published = (
        await db.execute(select(Vendor).where(Vendor.status == "published"))
    ).scalars().all()
    if not published:
        return {"rotated": False, "message": "No published vendors"}
    ids = [v.id for v in published]
    await db.execute(update(Vendor).values(featured=False))
    vid = random.choice(ids)
    await db.execute(update(Vendor).where(Vendor.id == vid).values(featured=True))
    await db.commit()
    return {"rotated": True, "vendor_id": vid}
