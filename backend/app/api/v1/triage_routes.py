from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.emergency_cash import EmergencyCashOption
from app.models.triage import TriageStep

router = APIRouter(prefix="/triage", tags=["triage"])


@router.get("/steps")
async def triage_steps(db: AsyncSession = Depends(get_db)) -> list[dict]:
    q = (
        select(TriageStep)
        .where(TriageStep.published.is_(True))
        .order_by(TriageStep.position, TriageStep.id)
    )
    rows = (await db.execute(q)).scalars().all()
    return [
        {
            "id": r.id,
            "position": r.position,
            "title": r.title,
            "body_md": r.body_md,
            "related_resource_id": r.related_resource_id,
        }
        for r in rows
    ]


@router.get("/cash-options")
async def cash_options(db: AsyncSession = Depends(get_db)) -> list[dict]:
    q = (
        select(EmergencyCashOption)
        .where(EmergencyCashOption.published.is_(True))
        .order_by(EmergencyCashOption.sort_order, EmergencyCashOption.id)
    )
    rows = (await db.execute(q)).scalars().all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "what_it_is": r.what_it_is,
            "who_qualifies": r.who_qualifies,
            "url": r.url,
            "est_time_to_funds": r.est_time_to_funds,
        }
        for r in rows
    ]
