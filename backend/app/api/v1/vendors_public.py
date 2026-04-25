import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db
from app.limiter import limiter
from app.models.vendor import Vendor
from app.services.captcha import verify_hcaptcha

router = APIRouter(prefix="/vendors", tags=["vendors"])


class ShopLink(BaseModel):
    label: str = Field(max_length=64)
    url: str = Field(max_length=2048)


class VendorCreate(BaseModel):
    brand_name: str = Field(max_length=255)
    category: str = Field(
        pattern="^(jewelry|food|clothing|art|beauty|home|other)$"
    )
    city: str = Field(max_length=255)
    state: str = Field(max_length=8)
    bio_150: str = Field(max_length=160)
    shop_links: list[ShopLink] = Field(default_factory=list, max_length=4)
    submitted_email: EmailStr
    hcaptcha_token: str | None = None


class VendorUpdateRequest(BaseModel):
    brand_name: str | None = None
    category: str | None = Field(None, pattern="^(jewelry|food|clothing|art|beauty|home|other)$")
    city: str | None = None
    state: str | None = None
    bio_150: str | None = Field(None, max_length=160)
    shop_links: list[ShopLink] | None = None
    submitted_email: EmailStr
    note: str | None = None
    hcaptcha_token: str | None = None


class RemovalRequestBody(BaseModel):
    submitted_email: EmailStr
    hcaptcha_token: str | None = None


class RemovalConfirmBody(BaseModel):
    token: str


@router.get("")
async def list_vendors(
    db: AsyncSession = Depends(get_db),
    search: str | None = None,
    category: str | None = None,
    state: str | None = None,
    featured: bool | None = None,
) -> list[dict]:
    q = select(Vendor).where(Vendor.status == "published")
    if category:
        q = q.where(Vendor.category == category)
    if state:
        q = q.where(Vendor.state == state)
    if featured is not None:
        q = q.where(Vendor.featured.is_(featured))
    q = q.order_by(Vendor.featured.desc(), Vendor.brand_name)
    rows = (await db.execute(q)).scalars().all()
    out = [_vendor_public(r) for r in rows]
    if search:
        s = search.lower()
        out = [v for v in out if s in v["brand_name"].lower() or s in (v.get("bio_150") or "").lower()]
    return out


def _vendor_public(v: Vendor) -> dict:
    return {
        "id": v.id,
        "brand_name": v.brand_name,
        "category": v.category,
        "city": v.city,
        "state": v.state,
        "bio_150": v.bio_150,
        "shop_links": v.shop_links or [],
        "featured": v.featured,
    }


@router.get("/{vendor_id}")
async def get_vendor(vendor_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    v = (
        await db.execute(select(Vendor).where(Vendor.id == vendor_id, Vendor.status == "published"))
    ).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Not found")
    return _vendor_public(v)


@router.post("")
@limiter.limit("30/minute")
async def create_vendor(request: Request, body: VendorCreate, db: AsyncSession = Depends(get_db)) -> dict:
    settings = get_settings()
    domain = str(body.submitted_email).split("@")[-1].lower()
    if domain in settings.blocked_email_domains:
        raise HTTPException(status_code=400, detail="Invalid email")
    if not await verify_hcaptcha(body.hcaptcha_token, request.client.host if request.client else None):
        raise HTTPException(status_code=400, detail="Captcha failed")
    links = [x.model_dump() for x in body.shop_links][:4]
    row = Vendor(
        brand_name=body.brand_name,
        category=body.category,
        city=body.city,
        state=body.state,
        bio_150=body.bio_150,
        shop_links=links,
        submitted_email=str(body.submitted_email),
        status="pending",
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "status": row.status}


@router.post("/{vendor_id}/update-request")
@limiter.limit("30/minute")
async def vendor_update_request(
    request: Request,
    vendor_id: int,
    body: VendorUpdateRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    v = (await db.execute(select(Vendor).where(Vendor.id == vendor_id))).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Not found")
    if str(body.submitted_email).lower() != v.submitted_email.lower():
        raise HTTPException(status_code=403, detail="Email does not match")
    if not await verify_hcaptcha(body.hcaptcha_token, request.client.host if request.client else None):
        raise HTTPException(status_code=400, detail="Captcha failed")
    # Store pending update as JSON in site_settings or append note - MVP: log to a simple VendorUpdateRequest table
    # For MVP we use SiteSetting with key prefix vendor_update_
    from app.models.site_setting import SiteSetting

    payload = body.model_dump(exclude={"hcaptcha_token"}, exclude_none=True)
    key = f"vendor_update_{vendor_id}_{uuid.uuid4().hex[:8]}"
    db.add(SiteSetting(key=key, value=str(payload)))
    await db.commit()
    return {"ok": True, "message": "Update request received; team will review within 24 hours."}


@router.post("/removal-request")
@limiter.limit("10/minute")
async def vendor_removal_request(
    request: Request,
    body: RemovalRequestBody,
    db: AsyncSession = Depends(get_db),
) -> dict:
    if not await verify_hcaptcha(body.hcaptcha_token, request.client.host if request.client else None):
        raise HTTPException(status_code=400, detail="Captcha failed")
    result = await db.execute(
        select(Vendor).where(Vendor.submitted_email == str(body.submitted_email), Vendor.status != "removed")
    )
    vendors = result.scalars().all()
    tokens: list[str] = []
    for v in vendors:
        tok = secrets.token_urlsafe(32)
        v.removal_token = tok
        tokens.append(tok)
    await db.commit()
    out: dict = {"ok": True, "message": "Removal tokens issued for matching profiles (email in production)."}
    if get_settings().app_env == "development":
        out["tokens"] = tokens
    return out


@router.post("/removal-confirm")
@limiter.limit("10/minute")
async def vendor_removal_confirm(
    request: Request, body: RemovalConfirmBody, db: AsyncSession = Depends(get_db)
) -> dict:
    v = (await db.execute(select(Vendor).where(Vendor.removal_token == body.token))).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=400, detail="Invalid token")
    v.status = "removed"
    v.removal_token = None
    await db.commit()
    return {"ok": True}
