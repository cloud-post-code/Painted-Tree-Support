from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import OptionalUser
from app.limiter import limiter
from app.models.listing import Listing
from app.services.captcha import verify_hcaptcha
from app.services.link_preview import fetch_hero_image_url, normalize_page_url

router = APIRouter(prefix="/listings", tags=["listings"])


class ListingCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    listing_type: str = Field(..., alias="type", pattern="^(booth_offer|vendor_seeking)$")
    brand_or_space_name: str = Field(max_length=512)
    location_city: str = Field(max_length=255)
    location_state: str = Field(max_length=8)
    cost_tier: str = Field(pattern="^(free|reduced|market)$")
    availability_text: str
    contact_phone: str | None = Field(None, max_length=64)
    contact_email: EmailStr | None = None
    website_url: str | None = Field(None, max_length=2048)
    category: str = Field("general", max_length=64)
    description: str | None = None
    hcaptcha_token: str | None = None


@router.get("")
async def list_listings(
    db: AsyncSession = Depends(get_db),
    listing_type: str | None = Query(None, alias="type"),
    state: str | None = Query(None),
) -> list[dict]:
    q = select(Listing).where(Listing.status == "published")
    if listing_type:
        q = q.where(Listing.type == listing_type)
    if state:
        q = q.where(Listing.location_state == state)
    q = q.order_by(Listing.created_at.desc())
    rows = (await db.execute(q)).scalars().all()
    return [_listing_public(r) for r in rows]


def _listing_public(r: Listing) -> dict:
    return {
        "id": r.id,
        "type": r.type,
        "brand_or_space_name": r.brand_or_space_name,
        "location_city": r.location_city,
        "location_state": r.location_state,
        "cost_tier": r.cost_tier,
        "availability_text": r.availability_text,
        "description": r.description,
        "contact_email": r.contact_email,
        "contact_phone": r.contact_phone,
        "website_url": r.website_url,
        "category": r.category or "general",
        "hero_image_url": r.hero_image_url,
    }


@router.post("")
@limiter.limit("60/minute")
async def create_listing(
    request: Request,
    body: ListingCreate,
    user: OptionalUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    from app.core.config import get_settings

    settings = get_settings()
    if user:
        contact_email = user.email
    elif body.contact_email:
        contact_email = str(body.contact_email)
    else:
        raise HTTPException(status_code=400, detail="contact_email is required")
    domain = contact_email.split("@")[-1].lower()
    if domain in settings.blocked_email_domains:
        raise HTTPException(status_code=400, detail="Invalid email")
    if not await verify_hcaptcha(body.hcaptcha_token, request.client.host if request.client else None):
        raise HTTPException(status_code=400, detail="Captcha failed")
    phone = (body.contact_phone or "").strip() or None
    web_norm = normalize_page_url(body.website_url or "")
    hero: str | None = None
    if web_norm:
        hero = await fetch_hero_image_url(web_norm)
    row = Listing(
        type=body.listing_type,
        brand_or_space_name=body.brand_or_space_name,
        location_city=body.location_city,
        location_state=body.location_state,
        cost_tier=body.cost_tier,
        availability_text=body.availability_text,
        contact_phone=phone[:64] if phone else None,
        contact_email=contact_email,
        website_url=web_norm,
        category=body.category,
        hero_image_url=hero[:2048] if hero else None,
        description=body.description,
        status="pending",
        user_id=user.id if user else None,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "status": row.status}
