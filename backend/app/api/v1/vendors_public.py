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
from app.services.vendor_product_sync import sync_vendor_legacy_from_product

router = APIRouter(prefix="/vendors", tags=["vendors"])


class ShopLink(BaseModel):
    label: str = Field(max_length=64)
    url: str = Field(max_length=2048)


class VendorCreate(BaseModel):
    """Public survey: exactly the eight product fields (camelCase in JSON) plus optional shop links and email."""

    model_config = ConfigDict(str_strip_whitespace=True, populate_by_name=True)

    product_name: str = Field(..., alias="productName", min_length=1, max_length=255)
    product_description: str | None = Field(None, alias="productDescription")
    product_price: str | None = Field(None, alias="productPrice", max_length=64)
    product_category: str = Field("other", alias="productCategory", max_length=64)
    product_stock: str | None = Field(None, alias="productStock", max_length=32)
    product_image: str | None = Field(None, alias="productImage", max_length=2048)
    product_brand: str | None = Field(None, alias="productBrand", max_length=255)
    product_rating: str | None = Field(None, alias="productRating", max_length=32)
    shop_links: list[ShopLink] = Field(default_factory=list, max_length=4)
    submitted_email: EmailStr | None = None
    hcaptcha_token: str | None = None

    @field_validator(
        "product_description",
        "product_price",
        "product_stock",
        "product_image",
        "product_brand",
        "product_rating",
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

    product_name: str | None = Field(None, alias="productName", max_length=255)
    product_description: str | None = Field(None, alias="productDescription")
    product_price: str | None = Field(None, alias="productPrice", max_length=64)
    product_category: str | None = Field(None, alias="productCategory", max_length=64)
    product_stock: str | None = Field(None, alias="productStock", max_length=32)
    product_image: str | None = Field(None, alias="productImage", max_length=2048)
    product_brand: str | None = Field(None, alias="productBrand", max_length=255)
    product_rating: str | None = Field(None, alias="productRating", max_length=32)
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
    q = q.order_by(Vendor.featured.desc(), Vendor.product_name)
    rows = (await db.execute(q)).scalars().all()
    out = [_vendor_public(r) for r in rows]
    if search:
        s = search.lower()

        def _haystack(vendor: dict) -> str:
            parts: list[str] = [
                vendor.get("productName") or "",
                vendor.get("productBrand") or "",
                vendor.get("productDescription") or "",
                vendor.get("productCategory") or "",
                vendor.get("productPrice") or "",
                vendor.get("productStock") or "",
                vendor.get("productRating") or "",
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
        "productName": v.product_name,
        "productDescription": v.product_description,
        "productPrice": v.product_price,
        "productCategory": v.product_category,
        "productStock": v.product_stock,
        "productImage": v.product_image,
        "productBrand": v.product_brand,
        "productRating": v.product_rating,
        "shopLinks": v.shop_links or [],
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
    if kind not in ("logo", "banner"):
        raise HTTPException(status_code=400, detail="kind must be logo or banner")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    try:
        jpeg = process_vendor_image(raw, kind)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except OSError as e:
        raise HTTPException(status_code=400, detail="Could not read image") from e
    try:
        url = save_vendor_jpeg(jpeg)
    except OSError as e:
        raise HTTPException(status_code=500, detail="Could not store image") from e
    return {"url": url}


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
    links = [x.model_dump() for x in body.shop_links][:4]
    img = _validated_asset_url(body.product_image)
    pn = body.product_name.strip()[:255]
    pc = (body.product_category or "other").strip()[:64] or "other"
    row = Vendor(
        product_name=pn,
        product_description=_strip_opt(body.product_description, 65535),
        product_price=_strip_opt(body.product_price, 64),
        product_category=pc,
        product_stock=_strip_opt(body.product_stock, 32),
        product_image=img,
        product_brand=_strip_opt(body.product_brand, 255),
        product_rating=_strip_opt(body.product_rating, 32),
        brand_name=pn,
        category=pc,
        shop_links=links,
        submitted_email=submitted_email,
        status="pending",
        user_id=user.id if user else None,
    )
    sync_vendor_legacy_from_product(row)
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
