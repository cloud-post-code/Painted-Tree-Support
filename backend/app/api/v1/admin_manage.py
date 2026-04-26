import csv
import io
from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import CurrentAdmin
from app.models.announcement import Announcement
from app.models.community import CommunityLink
from app.models.emergency_cash import EmergencyCashOption
from app.models.guide import Guide
from app.models.legal import LegalArticle, LegalOrg
from app.models.listing import Listing
from app.models.resource import Resource
from app.models.service_offer import ServiceOffer
from app.models.site_counter import SiteCounter
from app.models.site_setting import SiteSetting
from app.models.space_offer import SpaceOffer
from app.models.template import Template
from app.models.triage import TriageStep
from app.models.vendor import Vendor
from app.models.volunteer import Volunteer

router = APIRouter(prefix="/admin/manage", tags=["admin-manage"])


# --- Announcements ---
class AnnouncementIn(BaseModel):
    body: str
    link_url: str | None = None
    link_text: str | None = None
    dismissible: bool = True
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    published: bool = False


@router.get("/announcements")
async def admin_list_announcements(
    admin: CurrentAdmin, db: Annotated[AsyncSession, Depends(get_db)]
) -> list[dict]:
    rows = (await db.execute(select(Announcement).order_by(Announcement.id.desc()))).scalars().all()
    return [
        {
            "id": r.id,
            "body": r.body,
            "link_url": r.link_url,
            "link_text": r.link_text,
            "dismissible": r.dismissible,
            "starts_at": r.starts_at.isoformat() if r.starts_at else None,
            "ends_at": r.ends_at.isoformat() if r.ends_at else None,
            "published": r.published,
        }
        for r in rows
    ]


@router.post("/announcements")
async def admin_create_announcement(
    admin: CurrentAdmin, body: AnnouncementIn, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    row = Announcement(**body.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": row.id}


@router.put("/announcements/{aid}")
async def admin_update_announcement(
    admin: CurrentAdmin, aid: int, body: AnnouncementIn, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    row = (await db.execute(select(Announcement).where(Announcement.id == aid))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Not found")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    await db.commit()
    return {"id": row.id}


@router.delete("/announcements/{aid}")
async def admin_delete_announcement(
    admin: CurrentAdmin, aid: int, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    await db.execute(delete(Announcement).where(Announcement.id == aid))
    await db.commit()
    return {"ok": True}


# --- Resources ---
class ResourceIn(BaseModel):
    title: str
    summary: str | None = None
    url: str
    category: str
    state: str | None = None
    tags: list | None = None
    speed_tier: str | None = None
    sort_order: int = 0
    published: bool = False
    eligibility_summary: str | None = None
    application_url: str | None = None
    deadline: date | None = None


@router.get("/resources")
async def admin_list_resources(
    admin: CurrentAdmin, db: Annotated[AsyncSession, Depends(get_db)]
) -> list[dict]:
    rows = (await db.execute(select(Resource).order_by(Resource.sort_order, Resource.id))).scalars().all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "summary": r.summary,
            "url": r.url,
            "category": r.category,
            "state": r.state,
            "tags": r.tags,
            "speed_tier": r.speed_tier,
            "sort_order": r.sort_order,
            "published": r.published,
            "eligibility_summary": r.eligibility_summary,
            "application_url": r.application_url,
            "deadline": r.deadline.isoformat() if r.deadline else None,
        }
        for r in rows
    ]


@router.post("/resources")
async def admin_create_resource(
    admin: CurrentAdmin, body: ResourceIn, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    row = Resource(**body.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": row.id}


@router.put("/resources/{rid}")
async def admin_update_resource(
    admin: CurrentAdmin, rid: int, body: ResourceIn, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    row = (await db.execute(select(Resource).where(Resource.id == rid))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Not found")
    data = body.model_dump()
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    return {"id": row.id}


@router.delete("/resources/{rid}")
async def admin_delete_resource(
    admin: CurrentAdmin, rid: int, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    await db.execute(delete(Resource).where(Resource.id == rid))
    await db.commit()
    return {"ok": True}


@router.post("/resources/import-csv")
async def admin_import_resources_csv(
    admin: CurrentAdmin,
    db: Annotated[AsyncSession, Depends(get_db)],
    file: Annotated[UploadFile, File()],
) -> dict:
    raw = await file.read()
    text = raw.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    created = 0
    updated = 0
    for row in reader:
        title = (row.get("title") or "").strip()
        url = (row.get("url") or "").strip()
        if not title or not url:
            continue
        category = (row.get("category") or "grant").strip()
        existing = (
            await db.execute(select(Resource).where(Resource.title == title, Resource.url == url))
        ).scalar_one_or_none()
        fields = {
            "title": title,
            "url": url,
            "category": category,
            "summary": (row.get("summary") or "").strip() or None,
            "state": (row.get("state") or "").strip() or None,
            "published": (row.get("published") or "true").lower() in ("1", "true", "yes"),
            "eligibility_summary": (row.get("eligibility_summary") or "").strip() or None,
            "application_url": (row.get("application_url") or "").strip() or None,
        }
        if existing:
            for k, v in fields.items():
                setattr(existing, k, v)
            updated += 1
        else:
            db.add(Resource(**fields))
            created += 1
    await db.commit()
    return {"created": created, "updated": updated}


# --- Counters & settings ---
class CounterIn(BaseModel):
    key: str
    value: int


@router.put("/counters")
async def admin_put_counters(
    admin: CurrentAdmin, body: list[CounterIn], db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    for c in body:
        row = (await db.execute(select(SiteCounter).where(SiteCounter.key == c.key))).scalar_one_or_none()
        if row:
            row.value = c.value
        else:
            db.add(SiteCounter(key=c.key, value=c.value))
    await db.commit()
    return {"ok": True}


class SettingIn(BaseModel):
    key: str
    value: str


@router.get("/settings")
async def admin_list_settings(admin: CurrentAdmin, db: Annotated[AsyncSession, Depends(get_db)]) -> list[dict]:
    rows = (await db.execute(select(SiteSetting))).scalars().all()
    return [{"key": r.key, "value": r.value} for r in rows]


@router.put("/settings")
async def admin_put_settings(
    admin: CurrentAdmin, body: list[SettingIn], db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    for s in body:
        row = (await db.execute(select(SiteSetting).where(SiteSetting.key == s.key))).scalar_one_or_none()
        if row:
            row.value = s.value
        else:
            db.add(SiteSetting(key=s.key, value=s.value))
    await db.commit()
    return {"ok": True}


# --- Triage ---
class TriageStepIn(BaseModel):
    position: int
    title: str
    body_md: str
    related_resource_id: int | None = None
    published: bool = True


@router.get("/triage/steps")
async def admin_triage_steps(admin: CurrentAdmin, db: Annotated[AsyncSession, Depends(get_db)]) -> list[dict]:
    rows = (await db.execute(select(TriageStep).order_by(TriageStep.position))).scalars().all()
    return [
        {
            "id": r.id,
            "position": r.position,
            "title": r.title,
            "body_md": r.body_md,
            "related_resource_id": r.related_resource_id,
            "published": r.published,
        }
        for r in rows
    ]


@router.post("/triage/steps")
async def admin_create_triage(
    admin: CurrentAdmin, body: TriageStepIn, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    row = TriageStep(**body.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": row.id}


@router.put("/triage/steps/{sid}")
async def admin_update_triage(
    admin: CurrentAdmin, sid: int, body: TriageStepIn, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    row = (await db.execute(select(TriageStep).where(TriageStep.id == sid))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Not found")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    await db.commit()
    return {"id": row.id}


class EmergencyIn(BaseModel):
    name: str
    what_it_is: str
    who_qualifies: str
    url: str
    est_time_to_funds: str
    sort_order: int = 0
    published: bool = True


@router.get("/triage/cash-options")
async def admin_cash(admin: CurrentAdmin, db: Annotated[AsyncSession, Depends(get_db)]) -> list[dict]:
    rows = (await db.execute(select(EmergencyCashOption).order_by(EmergencyCashOption.sort_order))).scalars().all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "what_it_is": r.what_it_is,
            "who_qualifies": r.who_qualifies,
            "url": r.url,
            "est_time_to_funds": r.est_time_to_funds,
            "sort_order": r.sort_order,
            "published": r.published,
        }
        for r in rows
    ]


@router.post("/triage/cash-options")
async def admin_create_cash(
    admin: CurrentAdmin, body: EmergencyIn, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    row = EmergencyCashOption(**body.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": row.id}


@router.put("/triage/cash-options/{cid}")
async def admin_update_cash(
    admin: CurrentAdmin, cid: int, body: EmergencyIn, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    row = (await db.execute(select(EmergencyCashOption).where(EmergencyCashOption.id == cid))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Not found")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    await db.commit()
    return {"id": row.id}


# --- Guides ---
class GuideIn(BaseModel):
    slug: str
    platform: str
    title: str
    summary: str | None = None
    body_md: str
    hero_image_url: str | None = None
    steps_count: int = 0
    published: bool = False


@router.get("/guides")
async def admin_guides(admin: CurrentAdmin, db: Annotated[AsyncSession, Depends(get_db)]) -> list[dict]:
    rows = (await db.execute(select(Guide).order_by(Guide.slug))).scalars().all()
    return [
        {
            "slug": r.slug,
            "platform": r.platform,
            "title": r.title,
            "summary": r.summary,
            "body_md": r.body_md,
            "steps_count": r.steps_count,
            "published": r.published,
        }
        for r in rows
    ]


@router.post("/guides")
async def admin_create_guide(
    admin: CurrentAdmin, body: GuideIn, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    row = Guide(**body.model_dump())
    db.add(row)
    await db.commit()
    return {"slug": row.slug}


@router.put("/guides/{slug}")
async def admin_update_guide(
    admin: CurrentAdmin, slug: str, body: GuideIn, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    row = (await db.execute(select(Guide).where(Guide.slug == slug))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Not found")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    await db.commit()
    return {"slug": row.slug}


# --- Listings moderation ---
@router.get("/listings")
async def admin_listings(
    admin: CurrentAdmin, db: Annotated[AsyncSession, Depends(get_db)], status: str | None = None
) -> list[dict]:
    q = select(Listing).order_by(Listing.created_at.desc())
    if status:
        q = q.where(Listing.status == status)
    rows = (await db.execute(q)).scalars().all()
    return [
        {
            "id": r.id,
            "type": r.type,
            "brand_or_space_name": r.brand_or_space_name,
            "location_city": r.location_city,
            "location_state": r.location_state,
            "cost_tier": r.cost_tier,
            "availability_text": r.availability_text,
            "contact_phone": r.contact_phone,
            "contact_email": r.contact_email,
            "description": r.description,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.put("/listings/{lid}")
async def admin_set_listing_status(
    admin: CurrentAdmin, lid: int, status: str, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    if status not in ("pending", "published", "removed"):
        raise HTTPException(400, "bad status")
    row = (await db.execute(select(Listing).where(Listing.id == lid))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Not found")
    row.status = status
    await db.commit()
    return {"id": row.id, "status": row.status}


# --- Community ---
class CommunityIn(BaseModel):
    name: str
    channel_url: str
    description: str | None = None
    sort_order: int = 0


@router.get("/community/links")
async def admin_community(admin: CurrentAdmin, db: Annotated[AsyncSession, Depends(get_db)]) -> list[dict]:
    rows = (await db.execute(select(CommunityLink).order_by(CommunityLink.sort_order))).scalars().all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "channel_url": r.channel_url,
            "description": r.description,
            "sort_order": r.sort_order,
        }
        for r in rows
    ]


@router.post("/community/links")
async def admin_create_community(
    admin: CurrentAdmin, body: CommunityIn, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    row = CommunityLink(**body.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": row.id}


@router.put("/community/links/{cid}")
async def admin_update_community(
    admin: CurrentAdmin, cid: int, body: CommunityIn, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    row = (await db.execute(select(CommunityLink).where(CommunityLink.id == cid))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Not found")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    await db.commit()
    return {"id": row.id}


@router.delete("/community/links/{cid}")
async def admin_delete_community(
    admin: CurrentAdmin, cid: int, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    await db.execute(delete(CommunityLink).where(CommunityLink.id == cid))
    await db.commit()
    return {"ok": True}


# --- Vendors ---
def _vendor_admin_summary(r: Vendor) -> dict:
    return {
        "id": r.id,
        "brand_name": r.brand_name,
        "category": r.category,
        "city": r.city,
        "state": r.state,
        "bio_150": r.bio_150,
        "shop_links": r.shop_links,
        "submitted_email": r.submitted_email,
        "status": r.status,
        "featured": r.featured,
        "pt_listing_id": r.pt_listing_id,
        "logo_url": r.logo_url,
        "banner_url": r.banner_url,
        "pt_previous_locations": r.pt_previous_locations,
    }


def _vendor_admin_full(r: Vendor) -> dict:
    d = _vendor_admin_summary(r)
    d["description_full"] = r.description_full
    d["pt_category_names"] = r.pt_category_names or []
    d["pt_current_locations"] = r.pt_current_locations or []
    return d


class VendorAdminShopLink(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    label: str = Field(max_length=64)
    url: str = Field(max_length=2048)


class VendorAdminUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    brand_name: str | None = Field(None, max_length=255)
    category: str | None = Field(None, pattern="^(jewelry|food|clothing|art|beauty|home|other)$")
    city: str | None = Field(None, max_length=255)
    state: str | None = Field(None, max_length=8)
    bio_150: str | None = Field(None, max_length=160)
    description_full: str | None = None
    logo_url: str | None = Field(None, max_length=2048)
    banner_url: str | None = Field(None, max_length=2048)
    pt_previous_locations: list[str] | None = None
    pt_current_locations: list[str] | None = None
    pt_category_names: list[str] | None = None
    shop_links: list[VendorAdminShopLink] | None = Field(None, max_length=4)
    status: str | None = Field(None, pattern="^(pending|published|removed)$")
    featured: bool | None = None


@router.get("/vendors")
async def admin_vendors(
    admin: CurrentAdmin, db: Annotated[AsyncSession, Depends(get_db)], status: str | None = None
) -> list[dict]:
    q = select(Vendor).order_by(Vendor.created_at.desc())
    if status:
        q = q.where(Vendor.status == status)
    rows = (await db.execute(q)).scalars().all()
    return [_vendor_admin_summary(r) for r in rows]


@router.get("/vendors/{vid}")
async def admin_vendor_get(admin: CurrentAdmin, vid: int, db: Annotated[AsyncSession, Depends(get_db)]) -> dict:
    row = (await db.execute(select(Vendor).where(Vendor.id == vid))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Not found")
    return _vendor_admin_full(row)


@router.patch("/vendors/{vid}")
async def admin_vendor_patch(
    admin: CurrentAdmin, vid: int, body: VendorAdminUpdate, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    row = (await db.execute(select(Vendor).where(Vendor.id == vid))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Not found")
    data = body.model_dump(exclude_unset=True)
    if "shop_links" in data and data["shop_links"] is not None:
        data["shop_links"] = [dict(x) for x in data["shop_links"]][:4]
    for k, v in data.items():
        if v == "" and k in ("logo_url", "banner_url", "description_full"):
            v = None
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _vendor_admin_full(row)


@router.put("/vendors/{vid}")
async def admin_vendor_status(
    admin: CurrentAdmin,
    vid: int,
    status: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    featured: bool | None = None,
):
    if status not in ("pending", "published", "removed"):
        raise HTTPException(400, "bad status")
    row = (await db.execute(select(Vendor).where(Vendor.id == vid))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Not found")
    row.status = status
    if featured is not None:
        row.featured = featured
    await db.commit()
    return {"id": row.id, "status": row.status, "featured": row.featured}


# --- Legal ---
class LegalArticleIn(BaseModel):
    slug: str
    title: str
    body_md: str
    category: str
    published: bool = False
    review_signed_off_at: datetime | None = None
    reviewer_name: str | None = None


@router.get("/legal/articles")
async def admin_legal_articles(admin: CurrentAdmin, db: Annotated[AsyncSession, Depends(get_db)]) -> list[dict]:
    rows = (await db.execute(select(LegalArticle).order_by(LegalArticle.slug))).scalars().all()
    return [
        {
            "slug": r.slug,
            "title": r.title,
            "category": r.category,
            "published": r.published,
            "review_signed_off_at": r.review_signed_off_at.isoformat() if r.review_signed_off_at else None,
            "reviewer_name": r.reviewer_name,
        }
        for r in rows
    ]


@router.post("/legal/articles")
async def admin_create_legal_article(
    admin: CurrentAdmin, body: LegalArticleIn, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    if body.published and (not body.review_signed_off_at or not body.reviewer_name):
        raise HTTPException(400, "Attorney sign-off required to publish")
    row = LegalArticle(**body.model_dump())
    db.add(row)
    await db.commit()
    return {"slug": row.slug}


@router.put("/legal/articles/{slug}")
async def admin_update_legal_article(
    admin: CurrentAdmin, slug: str, body: LegalArticleIn, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    row = (await db.execute(select(LegalArticle).where(LegalArticle.slug == slug))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Not found")
    if body.published and (not body.review_signed_off_at or not body.reviewer_name):
        raise HTTPException(400, "Attorney sign-off required to publish")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    await db.commit()
    return {"slug": row.slug}


class LegalOrgIn(BaseModel):
    name: str
    type: str
    states: list = Field(default_factory=list)
    areas_of_practice: list = Field(default_factory=list)
    contact_email: str | None = None
    contact_phone: str | None = None
    website: str
    status: str = "published"
    sort_order: int = 0


@router.get("/legal/orgs")
async def admin_legal_orgs(admin: CurrentAdmin, db: Annotated[AsyncSession, Depends(get_db)]) -> list[dict]:
    rows = (await db.execute(select(LegalOrg).order_by(LegalOrg.sort_order, LegalOrg.id))).scalars().all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "type": r.type,
            "states": r.states,
            "areas_of_practice": r.areas_of_practice,
            "contact_email": r.contact_email,
            "contact_phone": r.contact_phone,
            "website": r.website,
            "status": r.status,
        }
        for r in rows
    ]


@router.post("/legal/orgs")
async def admin_create_legal_org(
    admin: CurrentAdmin, body: LegalOrgIn, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    row = LegalOrg(**body.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": row.id}


@router.put("/legal/orgs/{oid}")
async def admin_update_legal_org(
    admin: CurrentAdmin, oid: int, body: LegalOrgIn, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    row = (await db.execute(select(LegalOrg).where(LegalOrg.id == oid))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Not found")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    await db.commit()
    return {"id": row.id}


# --- Templates ---
class TemplateIn(BaseModel):
    kind: str
    title: str
    body_md: str
    channel: str | None = None
    tone: str | None = None
    file_url: str | None = None
    published: bool = True


@router.get("/templates")
async def admin_templates(admin: CurrentAdmin, db: Annotated[AsyncSession, Depends(get_db)]) -> list[dict]:
    rows = (await db.execute(select(Template).order_by(Template.id))).scalars().all()
    return [
        {
            "id": r.id,
            "kind": r.kind,
            "title": r.title,
            "body_md": r.body_md,
            "channel": r.channel,
            "tone": r.tone,
            "file_url": r.file_url,
            "published": r.published,
        }
        for r in rows
    ]


@router.post("/templates")
async def admin_create_template(
    admin: CurrentAdmin, body: TemplateIn, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    row = Template(**body.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": row.id}


@router.put("/templates/{tid}")
async def admin_update_template(
    admin: CurrentAdmin, tid: int, body: TemplateIn, db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    row = (await db.execute(select(Template).where(Template.id == tid))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Not found")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    await db.commit()
    return {"id": row.id}


# --- Supporter moderation ---
@router.get("/space-offers")
async def admin_space(admin: CurrentAdmin, db: Annotated[AsyncSession, Depends(get_db)], status: str | None = None):
    q = select(SpaceOffer).order_by(SpaceOffer.created_at.desc())
    if status:
        q = q.where(SpaceOffer.status == status)
    rows = (await db.execute(q)).scalars().all()
    return [
        {
            "id": r.id,
            "space_type": r.space_type,
            "location_city": r.location_city,
            "location_state": r.location_state,
            "cost_tier": r.cost_tier,
            "contact_phone": r.contact_phone,
            "contact_email": r.contact_email,
            "status": r.status,
        }
        for r in rows
    ]


@router.put("/space-offers/{sid}")
async def admin_space_status(
    admin: CurrentAdmin, sid: int, status: str, db: Annotated[AsyncSession, Depends(get_db)]
):
    if status not in ("pending", "published", "removed"):
        raise HTTPException(400, "bad status")
    row = (await db.execute(select(SpaceOffer).where(SpaceOffer.id == sid))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Not found")
    row.status = status
    await db.commit()
    return {"id": row.id}


@router.get("/service-offers")
async def admin_svc(admin: CurrentAdmin, db: Annotated[AsyncSession, Depends(get_db)], status: str | None = None):
    q = select(ServiceOffer).order_by(ServiceOffer.created_at.desc())
    if status:
        q = q.where(ServiceOffer.status == status)
    rows = (await db.execute(q)).scalars().all()
    return [
        {
            "id": r.id,
            "service_type": r.service_type,
            "contact_phone": r.contact_phone,
            "contact_email": r.contact_email,
            "status": r.status,
        }
        for r in rows
    ]


@router.put("/service-offers/{sid}")
async def admin_svc_status(
    admin: CurrentAdmin, sid: int, status: str, db: Annotated[AsyncSession, Depends(get_db)]
):
    if status not in ("pending", "published", "removed"):
        raise HTTPException(400, "bad status")
    row = (await db.execute(select(ServiceOffer).where(ServiceOffer.id == sid))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Not found")
    row.status = status
    await db.commit()
    return {"id": row.id}


@router.get("/volunteers")
async def admin_vol(admin: CurrentAdmin, db: Annotated[AsyncSession, Depends(get_db)], status: str | None = None):
    q = select(Volunteer).order_by(Volunteer.created_at.desc())
    if status:
        q = q.where(Volunteer.status == status)
    rows = (await db.execute(q)).scalars().all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "email": r.email,
            "status": r.status,
        }
        for r in rows
    ]


@router.put("/volunteers/{vid}")
async def admin_vol_status(
    admin: CurrentAdmin, vid: int, status: str, db: Annotated[AsyncSession, Depends(get_db)]
):
    if status not in ("pending", "published", "removed"):
        raise HTTPException(400, "bad status")
    row = (await db.execute(select(Volunteer).where(Volunteer.id == vid))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Not found")
    row.status = status
    await db.commit()
    return {"id": row.id}
