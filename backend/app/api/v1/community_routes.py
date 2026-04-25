from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.community import CommunityLink

router = APIRouter(prefix="/community", tags=["community"])


@router.get("/links")
async def community_links(db: AsyncSession = Depends(get_db)) -> list[dict]:
    q = select(CommunityLink).order_by(CommunityLink.sort_order, CommunityLink.id)
    rows = (await db.execute(q)).scalars().all()
    return [
        {"id": r.id, "name": r.name, "channel_url": r.channel_url, "description": r.description}
        for r in rows
    ]
