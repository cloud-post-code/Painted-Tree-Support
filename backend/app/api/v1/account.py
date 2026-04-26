from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import CurrentUser
from app.models.announcement import Announcement
from app.models.listing import Listing
from app.models.message_blast import MessageBlast, MessageBlastRecipient
from app.models.service_offer import ServiceOffer
from app.models.space_offer import SpaceOffer
from app.models.vendor import Vendor
from app.models.volunteer import Volunteer

router = APIRouter(prefix="/account", tags=["account"])


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


@router.get("/submissions")
async def list_my_submissions(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    vendors = (
        await db.execute(
            select(Vendor)
            .where(Vendor.user_id == user.id)
            .order_by(Vendor.created_at.desc())
        )
    ).scalars().all()
    listings = (
        await db.execute(
            select(Listing)
            .where(Listing.user_id == user.id)
            .order_by(Listing.created_at.desc())
        )
    ).scalars().all()
    spaces = (
        await db.execute(
            select(SpaceOffer)
            .where(SpaceOffer.user_id == user.id)
            .order_by(SpaceOffer.created_at.desc())
        )
    ).scalars().all()
    services = (
        await db.execute(
            select(ServiceOffer)
            .where(ServiceOffer.user_id == user.id)
            .order_by(ServiceOffer.created_at.desc())
        )
    ).scalars().all()
    volunteers = (
        await db.execute(
            select(Volunteer)
            .where(Volunteer.user_id == user.id)
            .order_by(Volunteer.created_at.desc())
        )
    ).scalars().all()

    return {
        "vendors": [
            {
                "id": v.id,
                "kind": "vendor",
                "title": v.brand_name,
                "subtitle": f"{v.city}, {v.state}",
                "status": v.status,
                "created_at": _iso(v.created_at),
                "permalink": f"/vendors/{v.id}" if v.status == "published" else None,
            }
            for v in vendors
        ],
        "listings": [
            {
                "id": r.id,
                "kind": "listing",
                "title": r.brand_or_space_name,
                "subtitle": f"{r.type} — {r.location_city}, {r.location_state}",
                "status": r.status,
                "created_at": _iso(r.created_at),
                "permalink": "/sell-now/listings",
            }
            for r in listings
        ],
        "space_offers": [
            {
                "id": s.id,
                "kind": "space_offer",
                "title": s.space_type,
                "subtitle": f"{s.location_city}, {s.location_state}",
                "status": s.status,
                "created_at": _iso(s.created_at),
                "permalink": "/help/space",
            }
            for s in spaces
        ],
        "service_offers": [
            {
                "id": s.id,
                "kind": "service_offer",
                "title": s.service_type,
                "subtitle": s.availability[:80] if s.availability else "",
                "status": s.status,
                "created_at": _iso(s.created_at),
                "permalink": "/help/services",
            }
            for s in services
        ],
        "volunteers": [
            {
                "id": v.id,
                "kind": "volunteer",
                "title": v.name,
                "subtitle": (v.areas_of_interest or "")[:80],
                "status": v.status,
                "created_at": _iso(v.created_at),
                "permalink": "/help/volunteer",
            }
            for v in volunteers
        ],
    }


@router.get("/inbox")
async def get_inbox(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    rows = (
        await db.execute(
            select(MessageBlastRecipient, MessageBlast)
            .join(MessageBlast, MessageBlast.id == MessageBlastRecipient.blast_id)
            .where(MessageBlastRecipient.user_id == user.id)
            .order_by(MessageBlast.created_at.desc())
        )
    ).all()

    blasts: list[dict] = []
    unread = 0
    for recipient, blast in rows:
        is_read = recipient.read_at is not None
        is_dismissed = recipient.dismissed_at is not None
        if not is_read and not is_dismissed:
            unread += 1
        blasts.append(
            {
                "recipient_id": recipient.id,
                "blast_id": blast.id,
                "subject": blast.subject,
                "body": blast.body,
                "link_url": blast.link_url,
                "link_text": blast.link_text,
                "audience": blast.audience,
                "sent_at": _iso(blast.sent_at or blast.created_at),
                "read_at": _iso(recipient.read_at),
                "dismissed_at": _iso(recipient.dismissed_at),
            }
        )

    now = datetime.now(UTC)
    ann_q = (
        select(Announcement)
        .where(
            Announcement.published.is_(True),
            or_(Announcement.starts_at.is_(None), Announcement.starts_at <= now),
            or_(Announcement.ends_at.is_(None), Announcement.ends_at >= now),
        )
        .order_by(Announcement.id.desc())
    )
    announcements = (await db.execute(ann_q)).scalars().all()

    return {
        "unread_count": unread,
        "blasts": blasts,
        "announcements": [
            {
                "id": a.id,
                "body": a.body,
                "link_url": a.link_url,
                "link_text": a.link_text,
                "starts_at": _iso(a.starts_at),
                "ends_at": _iso(a.ends_at),
            }
            for a in announcements
        ],
    }


async def _get_my_recipient(
    db: AsyncSession, user_id: int, recipient_id: int
) -> MessageBlastRecipient:
    row = (
        await db.execute(
            select(MessageBlastRecipient).where(
                MessageBlastRecipient.id == recipient_id,
                MessageBlastRecipient.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return row


@router.post("/inbox/{recipient_id}/read")
async def mark_read(
    recipient_id: int,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    row = await _get_my_recipient(db, user.id, recipient_id)
    if row.read_at is None:
        row.read_at = datetime.now(UTC)
        await db.commit()
    return {"ok": True}


@router.post("/inbox/{recipient_id}/dismiss")
async def mark_dismissed(
    recipient_id: int,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    row = await _get_my_recipient(db, user.id, recipient_id)
    now = datetime.now(UTC)
    if row.dismissed_at is None:
        row.dismissed_at = now
    if row.read_at is None:
        row.read_at = now
    await db.commit()
    return {"ok": True}
