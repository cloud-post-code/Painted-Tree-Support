from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.resource import Resource

router = APIRouter(prefix="/cashflow", tags=["cashflow"])


def _out(r: Resource) -> dict:
    return {
        "id": r.id,
        "title": r.title,
        "summary": r.summary,
        "url": r.url,
        "state": r.state,
        "eligibility_summary": r.eligibility_summary,
        "application_url": r.application_url or r.url,
        "deadline": r.deadline.isoformat() if r.deadline else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


@router.get("/grants")
async def grants(
    db: AsyncSession = Depends(get_db),
    state: str | None = Query(None),
) -> list[dict]:
    q = select(Resource).where(Resource.published.is_(True), Resource.category == "grant")
    if state:
        q = q.where(or_(Resource.state.is_(None), Resource.state == state))
    q = q.order_by(Resource.sort_order, Resource.id)
    rows = (await db.execute(q)).scalars().all()
    return [_out(r) for r in rows]


@router.get("/emergency")
async def emergency_funds(db: AsyncSession = Depends(get_db)) -> list[dict]:
    q = (
        select(Resource)
        .where(Resource.published.is_(True), Resource.category == "emergency_fund")
        .order_by(Resource.sort_order, Resource.id)
    )
    rows = (await db.execute(q)).scalars().all()
    return [_out(r) for r in rows]
