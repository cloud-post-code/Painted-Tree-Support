from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.guide import Guide

router = APIRouter(prefix="/guides", tags=["guides"])


@router.get("")
async def list_guides(db: AsyncSession = Depends(get_db)) -> list[dict]:
    q = select(Guide).where(Guide.published.is_(True)).order_by(Guide.platform, Guide.slug)
    rows = (await db.execute(q)).scalars().all()
    return [
        {
            "slug": r.slug,
            "platform": r.platform,
            "title": r.title,
            "summary": r.summary,
            "steps_count": r.steps_count,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in rows
    ]


@router.get("/{slug}")
async def get_guide(slug: str, db: AsyncSession = Depends(get_db)) -> dict:
    r = (await db.execute(select(Guide).where(Guide.slug == slug, Guide.published.is_(True)))).scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "slug": r.slug,
        "platform": r.platform,
        "title": r.title,
        "summary": r.summary,
        "body_md": r.body_md,
        "hero_image_url": r.hero_image_url,
        "steps_count": r.steps_count,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }
