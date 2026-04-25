from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.legal import LegalArticle, LegalOrg

router = APIRouter(prefix="/legal", tags=["legal"])


@router.get("/articles")
async def list_articles(db: AsyncSession = Depends(get_db)) -> list[dict]:
    q = select(LegalArticle).where(LegalArticle.published.is_(True)).order_by(LegalArticle.slug)
    rows = (await db.execute(q)).scalars().all()
    return [{"slug": r.slug, "title": r.title, "category": r.category} for r in rows]


@router.get("/articles/{slug}")
async def get_article(slug: str, db: AsyncSession = Depends(get_db)) -> dict:
    r = (
        await db.execute(select(LegalArticle).where(LegalArticle.slug == slug, LegalArticle.published.is_(True)))
    ).scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "slug": r.slug,
        "title": r.title,
        "body_md": r.body_md,
        "category": r.category,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


@router.get("/orgs")
async def list_orgs(
    db: AsyncSession = Depends(get_db),
    type: str | None = Query(None, description="pro_bono or legal_aid"),
    state: str | None = None,
    issue: str | None = None,
) -> list[dict]:
    q = select(LegalOrg).where(LegalOrg.status == "published")
    if type:
        q = q.where(LegalOrg.type == type)
    rows = (await db.execute(q)).scalars().all()
    out = []
    for r in rows:
        states = r.states or []
        areas = r.areas_of_practice or []
        if state and state not in states and states:
            continue
        if issue and issue not in areas and areas:
            continue
        out.append(
            {
                "id": r.id,
                "name": r.name,
                "type": r.type,
                "states": states,
                "areas_of_practice": areas,
                "contact_email": r.contact_email,
                "contact_phone": r.contact_phone,
                "website": r.website,
            }
        )
    return out
