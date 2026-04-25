from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db
from app.limiter import limiter
from app.models.service_offer import ServiceOffer
from app.models.space_offer import SpaceOffer
from app.models.volunteer import Volunteer
from app.services.captcha import verify_hcaptcha

router = APIRouter(prefix="/supporters", tags=["supporters"])


class SpaceOfferCreate(BaseModel):
    space_type: str
    location_city: str
    location_state: str
    cost_tier: str = Field(pattern="^(free|reduced|market)$")
    availability_text: str
    contact_email: EmailStr
    description: str | None = None
    hcaptcha_token: str | None = None


class ServiceOfferCreate(BaseModel):
    service_type: str = Field(pattern="^(legal|marketing|logistics|tech|other)$")
    availability: str
    cost_tier: str = Field(pattern="^(pro_bono|reduced|paid)$")
    contact_email: EmailStr
    description: str | None = None
    hcaptcha_token: str | None = None


class VolunteerCreate(BaseModel):
    name: str
    email: EmailStr
    skills: list[str] = Field(default_factory=list)
    availability: str
    areas_of_interest: str
    hcaptcha_token: str | None = None


@router.post("/space")
@limiter.limit("30/minute")
async def post_space(request: Request, body: SpaceOfferCreate, db: AsyncSession = Depends(get_db)) -> dict:
    settings = get_settings()
    domain = str(body.contact_email).split("@")[-1].lower()
    if domain in settings.blocked_email_domains:
        raise HTTPException(status_code=400, detail="Invalid email")
    if not await verify_hcaptcha(body.hcaptcha_token, request.client.host if request.client else None):
        raise HTTPException(status_code=400, detail="Captcha failed")
    row = SpaceOffer(
        space_type=body.space_type,
        location_city=body.location_city,
        location_state=body.location_state,
        cost_tier=body.cost_tier,
        availability_text=body.availability_text,
        contact_email=str(body.contact_email),
        description=body.description,
        status="pending",
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "status": row.status}


@router.post("/services")
@limiter.limit("30/minute")
async def post_services(request: Request, body: ServiceOfferCreate, db: AsyncSession = Depends(get_db)) -> dict:
    settings = get_settings()
    domain = str(body.contact_email).split("@")[-1].lower()
    if domain in settings.blocked_email_domains:
        raise HTTPException(status_code=400, detail="Invalid email")
    if not await verify_hcaptcha(body.hcaptcha_token, request.client.host if request.client else None):
        raise HTTPException(status_code=400, detail="Captcha failed")
    row = ServiceOffer(
        service_type=body.service_type,
        availability=body.availability,
        cost_tier=body.cost_tier,
        contact_email=str(body.contact_email),
        description=body.description,
        status="pending",
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "status": row.status}


@router.post("/volunteer")
@limiter.limit("30/minute")
async def post_volunteer(request: Request, body: VolunteerCreate, db: AsyncSession = Depends(get_db)) -> dict:
    settings = get_settings()
    domain = str(body.email).split("@")[-1].lower()
    if domain in settings.blocked_email_domains:
        raise HTTPException(status_code=400, detail="Invalid email")
    if not await verify_hcaptcha(body.hcaptcha_token, request.client.host if request.client else None):
        raise HTTPException(status_code=400, detail="Captcha failed")
    row = Volunteer(
        name=body.name,
        email=str(body.email),
        skills=body.skills,
        availability=body.availability,
        areas_of_interest=body.areas_of_interest,
        status="pending",
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "status": row.status}


@router.get("/space")
async def list_space_offers(db: AsyncSession = Depends(get_db)) -> list[dict]:
    q = select(SpaceOffer).where(SpaceOffer.status == "published").order_by(SpaceOffer.created_at.desc())
    rows = (await db.execute(q)).scalars().all()
    return [
        {
            "id": r.id,
            "space_type": r.space_type,
            "location_city": r.location_city,
            "location_state": r.location_state,
            "cost_tier": r.cost_tier,
            "availability_text": r.availability_text,
            "description": r.description,
        }
        for r in rows
    ]


@router.get("/services")
async def list_service_offers(db: AsyncSession = Depends(get_db)) -> list[dict]:
    q = select(ServiceOffer).where(ServiceOffer.status == "published").order_by(ServiceOffer.created_at.desc())
    rows = (await db.execute(q)).scalars().all()
    return [
        {
            "id": r.id,
            "service_type": r.service_type,
            "availability": r.availability,
            "cost_tier": r.cost_tier,
            "description": r.description,
        }
        for r in rows
    ]
