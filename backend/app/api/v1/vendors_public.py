import secrets
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db
from app.deps import OptionalUser
from app.limiter import limiter
from app.models.vendor import Vendor
from app.services.captcha import verify_hcaptcha
from app.services.vendor_images import allowed_vendor_asset_url, process_vendor_image, save_vendor_jpeg

router = APIRouter(prefix="/vendors", tags=["vendors"])


def _clean_categories(values: list[str] | None) -> list[str]:
    if not values:
        return []
    seen: set[str] = set()
    out: list[str] = []
    for raw in values:
        if raw is None:
            continue
        v = str(raw).strip()[:120]
        if not v:
            continue
        key = v.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(v)
        if len(out) >= 16:
            break
    return out


class VendorCreate(BaseModel):
    """Public submit survey: the canonical 8-field listing plus email + captcha."""

    model_config = ConfigDict(str_strip_whitespace=True, populate_by_name=True)

    name: str = Field(..., min_length=1, max_length=255)
    categories: list[str] = Field(default_factory=list)
    description: str | None = None
    previous_pt_location: str | None = Field(None, alias="previousPtLocation")
    current_location: str | None = Field(None, alias="currentLocation")
    logo_url: str | None = Field(None, alias="logoUrl", max_length=2048)
    hero_url: str | None = Field(None, alias="heroUrl", max_length=2048)
    website: str | None = Field(None, max_length=2048)
    submitted_email: EmailStr | None = None
    hcaptcha_token: str | None = None

    @field_validator(
        "description",
        "previous_pt_location",
        "current_location",
        "logo_url",
        "hero_url",
        "website",
        mode="after",
    )
    @classmethod
    def empty_str_to_none(cls, v: str | None) -> str | None:
        if v is None:
            return None
        t = str(v).strip()
        return t or None


class VendorUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = Field(None, max_length=255)
    categories: list[str] | None = None
    description: str | None = None
    previous_pt_location: str | None = Field(None, alias="previousPtLocation")
    current_location: str | None = Field(None, alias="currentLocation")
    logo_url: str | None = Field(None, alias="logoUrl", max_length=2048)
    hero_url: str | None = Field(None, alias="heroUrl", max_length=2048)
    website: str | None = Field(None, max_length=2048)
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
    featured: bool | None = None,
) -> list[dict]:
    q = select(Vendor).where(Vendor.status == "published")
    if featured is not None:
        q = q.where(Vendor.featured.is_(featured))
    q = q.order_by(Vendor.featured.desc(), Vendor.name)
    rows = (await db.execute(q)).scalars().all()
    out = [_vendor_public(r) for r in rows]
    if search:
        s = search.lower()

        def _haystack(vendor: dict) -> str:
            cats = vendor.get("categories") or []
            parts: list[str] = [
                vendor.get("name") or "",
                vendor.get("description") or "",
                vendor.get("previousPtLocation") or "",
                vendor.get("currentLocation") or "",
                vendor.get("website") or "",
                " ".join(str(c) for c in cats),
                str(vendor.get("id") or ""),
            ]
            return " ".join(parts).lower()

        out = [v for v in out if s in _haystack(v)]
    return out


def _strip_opt(s: str | None, max_len: int) -> str | None:
    if s is None:
        return None
    t = str(s).strip()
    if not t:
        return None
    return t[:max_len]


def _vendor_public(v: Vendor) -> dict:
    return {
        "id": v.id,
        "name": v.name,
        "categories": list(v.categories or []),
        "description": v.description,
        "previousPtLocation": v.previous_pt_location,
        "currentLocation": v.current_location,
        "logoUrl": v.logo_url,
        "heroUrl": v.hero_url,
        "website": v.website,
        "featured": v.featured,
    }


def _validated_asset_url(url: str | None) -> str | None:
    if not url or not str(url).strip():
        return None
    u = str(url).strip()[:2048]
    if not allowed_vendor_asset_url(u):
        raise HTTPException(
            status_code=400,
            detail="Invalid image URL — use a web address starting with https://, or upload an image file.",
        )
    return u


@router.post("/upload-image")
@limiter.limit("20/minute")
async def upload_vendor_image(
    request: Request,
    kind: str = Form(...),
    file: UploadFile = File(...),
) -> dict:
    _ = request
    if kind not in ("logo", "hero"):
        raise HTTPException(status_code=400, detail="kind must be logo or hero")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    # The image processor still uses the historical "banner" label for the wide aspect ratio.
    proc_kind = "logo" if kind == "logo" else "banner"
    try:
        jpeg = process_vendor_image(raw, proc_kind)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except OSError as e:
        raise HTTPException(status_code=400, detail="Could not read image") from e
    try:
        url = save_vendor_jpeg(jpeg)
    except OSError as e:
        raise HTTPException(status_code=500, detail="Could not store image") from e
    return {"url": url}


@router.post("")
@limiter.limit("30/minute")
async def create_vendor(
    request: Request,
    body: VendorCreate,
    user: OptionalUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    settings = get_settings()
    if user:
        submitted_email = user.email
    elif body.submitted_email:
        submitted_email = str(body.submitted_email)
    else:
        raise HTTPException(status_code=400, detail="submitted_email is required")
    domain = submitted_email.split("@")[-1].lower()
    if domain in settings.blocked_email_domains:
        raise HTTPException(status_code=400, detail="Invalid email")
    if not await verify_hcaptcha(body.hcaptcha_token, request.client.host if request.client else None):
        raise HTTPException(status_code=400, detail="Captcha failed")

    name = body.name.strip()[:255]
    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    row = Vendor(
        name=name,
        categories=_clean_categories(body.categories),
        description=_strip_opt(body.description, 65535),
        previous_pt_location=_strip_opt(body.previous_pt_location, 65535),
        current_location=_strip_opt(body.current_location, 65535),
        logo_url=_validated_asset_url(body.logo_url),
        hero_url=_validated_asset_url(body.hero_url),
        website=_strip_opt(body.website, 2048),
        submitted_email=submitted_email,
        status="pending",
        user_id=user.id if user else None,
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
