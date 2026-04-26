from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import distinct, func, select, union
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import CurrentAdmin
from app.models.listing import Listing
from app.models.message_blast import MessageBlast, MessageBlastRecipient
from app.models.service_offer import ServiceOffer
from app.models.space_offer import SpaceOffer
from app.models.user import User
from app.models.vendor import Vendor
from app.models.volunteer import Volunteer

router = APIRouter(prefix="/admin", tags=["admin-blasts-and-users"])

Audience = Literal["all", "vendors", "volunteers", "supporters", "specific"]


class BlastCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1)
    link_url: str | None = Field(default=None, max_length=2048)
    link_text: str | None = Field(default=None, max_length=255)
    audience: Audience = "all"
    user_ids: list[int] = Field(default_factory=list)


class UserPatch(BaseModel):
    is_admin: bool | None = None
    is_active: bool | None = None


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


async def _resolve_recipients(
    db: AsyncSession, audience: Audience, user_ids: list[int]
) -> list[int]:
    if audience == "specific":
        if not user_ids:
            raise HTTPException(status_code=400, detail="user_ids required for 'specific' audience")
        rows = (
            await db.execute(select(User.id).where(User.id.in_(user_ids), User.is_active.is_(True)))
        ).scalars().all()
        return list(rows)

    if audience == "all":
        rows = (
            await db.execute(select(User.id).where(User.is_active.is_(True)))
        ).scalars().all()
        return list(rows)

    if audience == "vendors":
        q = (
            select(distinct(Vendor.user_id))
            .join(User, User.id == Vendor.user_id)
            .where(Vendor.user_id.is_not(None), User.is_active.is_(True))
        )
        return [r for r in (await db.execute(q)).scalars().all() if r is not None]

    if audience == "volunteers":
        q = (
            select(distinct(Volunteer.user_id))
            .join(User, User.id == Volunteer.user_id)
            .where(Volunteer.user_id.is_not(None), User.is_active.is_(True))
        )
        return [r for r in (await db.execute(q)).scalars().all() if r is not None]

    if audience == "supporters":
        space_q = select(SpaceOffer.user_id).where(SpaceOffer.user_id.is_not(None))
        svc_q = select(ServiceOffer.user_id).where(ServiceOffer.user_id.is_not(None))
        u = union(space_q, svc_q).subquery()
        q = (
            select(distinct(u.c.user_id))
            .join(User, User.id == u.c.user_id)
            .where(User.is_active.is_(True))
        )
        return [r for r in (await db.execute(q)).scalars().all() if r is not None]

    raise HTTPException(status_code=400, detail="Unsupported audience")


# --- Blasts ---


@router.post("/blasts")
async def create_blast(
    body: BlastCreate,
    admin: CurrentAdmin,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    recipient_ids = await _resolve_recipients(db, body.audience, body.user_ids)
    now = datetime.now(UTC)
    blast = MessageBlast(
        subject=body.subject,
        body=body.body,
        link_url=body.link_url,
        link_text=body.link_text,
        audience=body.audience,
        created_by_user_id=admin.id,
        sent_at=now,
    )
    db.add(blast)
    await db.flush()
    for uid in recipient_ids:
        db.add(MessageBlastRecipient(blast_id=blast.id, user_id=uid))
    await db.commit()
    await db.refresh(blast)
    return {
        "id": blast.id,
        "audience": blast.audience,
        "recipient_count": len(recipient_ids),
        "sent_at": _iso(blast.sent_at),
    }


@router.get("/blasts")
async def list_blasts(
    admin: CurrentAdmin,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    _ = admin
    blasts = (
        await db.execute(select(MessageBlast).order_by(MessageBlast.created_at.desc()))
    ).scalars().all()

    counts_rows = (
        await db.execute(
            select(
                MessageBlastRecipient.blast_id,
                func.count(MessageBlastRecipient.id).label("total"),
                func.count(MessageBlastRecipient.read_at).label("read"),
                func.count(MessageBlastRecipient.dismissed_at).label("dismissed"),
            ).group_by(MessageBlastRecipient.blast_id)
        )
    ).all()
    counts = {
        row.blast_id: {"total": row.total, "read": row.read, "dismissed": row.dismissed}
        for row in counts_rows
    }

    out: list[dict] = []
    for b in blasts:
        c = counts.get(b.id, {"total": 0, "read": 0, "dismissed": 0})
        out.append(
            {
                "id": b.id,
                "subject": b.subject,
                "body": b.body,
                "link_url": b.link_url,
                "link_text": b.link_text,
                "audience": b.audience,
                "created_at": _iso(b.created_at),
                "sent_at": _iso(b.sent_at),
                "recipient_count": c["total"],
                "read_count": c["read"],
                "dismissed_count": c["dismissed"],
            }
        )
    return out


# --- Users ---


@router.get("/users")
async def list_users(
    admin: CurrentAdmin,
    db: Annotated[AsyncSession, Depends(get_db)],
    search: str | None = None,
) -> list[dict]:
    _ = admin
    q = select(User).order_by(User.created_at.desc())
    if search:
        like = f"%{search.lower()}%"
        q = q.where(func.lower(User.email).like(like))
    rows = (await db.execute(q)).scalars().all()

    submission_counts: dict[int, int] = {}
    for model in (Vendor, Listing, SpaceOffer, ServiceOffer, Volunteer):
        sub_rows = (
            await db.execute(
                select(model.user_id, func.count(model.id))
                .where(model.user_id.is_not(None))
                .group_by(model.user_id)
            )
        ).all()
        for uid, cnt in sub_rows:
            submission_counts[uid] = submission_counts.get(uid, 0) + cnt

    return [
        {
            "id": u.id,
            "email": u.email,
            "is_admin": u.is_admin,
            "is_active": u.is_active,
            "email_verified": u.email_verified,
            "created_at": _iso(u.created_at),
            "submission_count": submission_counts.get(u.id, 0),
        }
        for u in rows
    ]


@router.patch("/users/{user_id}")
async def patch_user(
    user_id: int,
    body: UserPatch,
    admin: CurrentAdmin,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    target = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if body.is_admin is not None:
        target.is_admin = body.is_admin
    if body.is_active is not None:
        # Prevent admin from deactivating themselves and locking the portal.
        if not body.is_active and target.id == admin.id:
            raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
        target.is_active = body.is_active
    await db.commit()
    return {
        "id": target.id,
        "email": target.email,
        "is_admin": target.is_admin,
        "is_active": target.is_active,
    }
