from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.announcement import Announcement
from app.models.resource import Resource
from app.models.site_counter import SiteCounter
from app.models.site_setting import SiteSetting

router = APIRouter(tags=["site"])


@router.get("/announcements/active")
async def active_announcements(db: AsyncSession = Depends(get_db)) -> list[dict]:
    now = datetime.now(UTC)
    q = (
        select(Announcement)
        .where(Announcement.published.is_(True))
        .where(or_(Announcement.starts_at.is_(None), Announcement.starts_at <= now))
        .where(or_(Announcement.ends_at.is_(None), Announcement.ends_at >= now))
        .order_by(Announcement.id.desc())
    )
    rows = (await db.execute(q)).scalars().all()
    return [
        {
            "id": r.id,
            "body": r.body,
            "link_url": r.link_url,
            "link_text": r.link_text,
            "dismissible": r.dismissible,
        }
        for r in rows
    ]


@router.get("/resources")
async def list_resources(
    db: AsyncSession = Depends(get_db),
    category: str | None = None,
    state: str | None = None,
    speed_tier: str | None = None,
    limit: int = Query(100, le=500),
) -> list[dict]:
    q = select(Resource).where(Resource.published.is_(True))
    if category:
        q = q.where(Resource.category == category)
    if state:
        q = q.where(or_(Resource.state.is_(None), Resource.state == state))
    if speed_tier:
        q = q.where(Resource.speed_tier == speed_tier)
    q = q.order_by(Resource.sort_order, Resource.id).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    return [_resource_out(r) for r in rows]


def _resource_out(r: Resource) -> dict:
    return {
        "id": r.id,
        "title": r.title,
        "summary": r.summary,
        "url": r.url,
        "category": r.category,
        "state": r.state,
        "tags": r.tags or [],
        "speed_tier": r.speed_tier,
        "sort_order": r.sort_order,
        "eligibility_summary": r.eligibility_summary,
        "application_url": r.application_url,
        "deadline": r.deadline.isoformat() if r.deadline else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


@router.get("/counters")
async def counters(db: AsyncSession = Depends(get_db)) -> dict[str, int]:
    rows = (await db.execute(select(SiteCounter))).scalars().all()
    return {r.key: int(r.value) for r in rows}


@router.get("/settings/public")
async def public_settings(db: AsyncSession = Depends(get_db)) -> dict:
    keys = [
        "discord_invite_url",
        "discord_widget_id",
        "discord_channel_general",
        "discord_channel_inventory",
        "discord_channel_cash",
        "discord_channel_legal",
        "gofundme_url",
        "google_maps_embed_url",
        "supporters_ack_html",
    ]
    result = await db.execute(select(SiteSetting).where(SiteSetting.key.in_(keys)))
    rows = result.scalars().all()
    return {s.key: s.value for s in rows}
