from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.deps import CurrentUser
from app.limiter import limiter
from app.models.listing import Listing
from app.models.service_offer import ServiceOffer
from app.models.space_offer import SpaceOffer
from app.models.user import User
from app.models.vendor import Vendor
from app.models.volunteer import Volunteer

# Two routers exposed by this module so /auth/* and /admin/* can coexist.
router = APIRouter(prefix="/auth", tags=["auth"])
admin_router = APIRouter(prefix="/admin", tags=["admin-auth"])


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class SeedBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


def _set_session_cookies(response: Response, token: str, is_admin: bool) -> None:
    settings = get_settings()
    secure = settings.app_env != "development"
    max_age = 60 * settings.access_token_expire_minutes
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=max_age,
        path="/",
    )
    # Non-httpOnly hint cookie so Edge middleware can gate /admin without
    # decoding the JWT. Real authorization is enforced by FastAPI on every call.
    response.set_cookie(
        key="is_admin",
        value="1" if is_admin else "0",
        httponly=False,
        secure=secure,
        samesite="lax",
        max_age=max_age,
        path="/",
    )


def _clear_session_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("is_admin", path="/")


async def _backfill_submissions(db: AsyncSession, user: User) -> None:
    email = user.email
    user_id = user.id
    await db.execute(
        update(Vendor)
        .where(Vendor.user_id.is_(None), Vendor.submitted_email == email)
        .values(user_id=user_id)
    )
    await db.execute(
        update(Listing)
        .where(Listing.user_id.is_(None), Listing.contact_email == email)
        .values(user_id=user_id)
    )
    await db.execute(
        update(SpaceOffer)
        .where(SpaceOffer.user_id.is_(None), SpaceOffer.contact_email == email)
        .values(user_id=user_id)
    )
    await db.execute(
        update(ServiceOffer)
        .where(ServiceOffer.user_id.is_(None), ServiceOffer.contact_email == email)
        .values(user_id=user_id)
    )
    await db.execute(
        update(Volunteer)
        .where(Volunteer.user_id.is_(None), Volunteer.email == email)
        .values(user_id=user_id)
    )


@router.post("/register")
@limiter.limit("10/minute")
async def auth_register(
    request: Request,
    body: RegisterBody,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    _ = request
    settings = get_settings()
    email = str(body.email).strip().lower()
    domain = email.split("@")[-1]
    if domain in settings.blocked_email_domains:
        raise HTTPException(status_code=400, detail="Invalid email")
    existing = (
        await db.execute(select(User).where(User.email == email))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="An account with that email already exists")
    user = User(email=email, password_hash=hash_password(body.password))
    db.add(user)
    await db.flush()
    await _backfill_submissions(db, user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(user.email)
    _set_session_cookies(response, token, user.is_admin)
    return {
        "email": user.email,
        "is_admin": user.is_admin,
        "access_token": token,
    }


@router.post("/login")
@limiter.limit("20/minute")
async def auth_login(
    request: Request,
    body: LoginBody,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    _ = request
    email = str(body.email).strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not user.is_active or not verify_password(user.password_hash, body.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(user.email)
    _set_session_cookies(response, token, user.is_admin)
    return {"email": user.email, "is_admin": user.is_admin, "access_token": token}


@router.post("/logout")
async def auth_logout(response: Response) -> dict:
    _clear_session_cookies(response)
    return {"message": "ok"}


@router.get("/me")
async def auth_me(user: CurrentUser) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "is_admin": user.is_admin,
        "email_verified": user.email_verified,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


# Legacy admin login: same logic but rejects non-admins so the admin login
# form returns a clear "not authorized" error instead of letting them in.
@admin_router.post("/login")
@limiter.limit("20/minute")
async def admin_login(
    request: Request,
    body: LoginBody,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    _ = request
    email = str(body.email).strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not user.is_active or not verify_password(user.password_hash, body.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not an admin account")
    token = create_access_token(user.email)
    _set_session_cookies(response, token, True)
    return {"email": user.email, "is_admin": True, "access_token": token}


@admin_router.post("/logout")
async def admin_logout(response: Response) -> dict:
    _clear_session_cookies(response)
    return {"message": "ok"}


@admin_router.get("/me")
async def admin_me(user: CurrentUser) -> dict:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return {"email": user.email, "is_admin": True}


@admin_router.post("/seed-first-user")
async def seed_first_user(
    body: SeedBody,
    db: Annotated[AsyncSession, Depends(get_db)],
    x_admin_bootstrap_token: Annotated[str | None, Header(alias="X-Admin-Bootstrap-Token")] = None,
) -> dict:
    settings = get_settings()
    if not settings.admin_bootstrap_token or x_admin_bootstrap_token != settings.admin_bootstrap_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    existing = await db.execute(select(User).where(User.is_admin.is_(True)).limit(1))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Admin already exists")
    email = str(body.email).strip().lower()
    user = User(
        email=email,
        password_hash=hash_password(body.password),
        is_admin=True,
        email_verified=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"email": user.email, "id": user.id}
