from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.template import Template

router = APIRouter(prefix="/toolkit", tags=["toolkit"])


@router.get("/templates")
async def list_templates(
    db: AsyncSession = Depends(get_db),
    kind: str | None = Query(None),
) -> list[dict]:
    q = select(Template).where(Template.published.is_(True))
    if kind:
        q = q.where(Template.kind == kind)
    q = q.order_by(Template.id)
    rows = (await db.execute(q)).scalars().all()
    return [
        {
            "id": r.id,
            "kind": r.kind,
            "title": r.title,
            "body_md": r.body_md,
            "channel": r.channel,
            "tone": r.tone,
            "file_url": r.file_url,
        }
        for r in rows
    ]
