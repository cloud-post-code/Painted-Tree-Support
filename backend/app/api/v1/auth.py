from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.deps import CurrentAdmin
from app.models.admin_user import AdminUser

router = APIRouter(prefix="/admin", tags=["admin-auth"])


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class SeedBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


@router.post("/login")
async def admin_login(
    body: LoginBody,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    result = await db.execute(select(AdminUser).where(AdminUser.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(user.password_hash, body.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(user.email)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=get_settings().app_env != "development",
        samesite="lax",
        max_age=60 * get_settings().access_token_expire_minutes,
        path="/",
    )
    return {"email": user.email, "access_token": token}


@router.post("/logout")
async def admin_logout(response: Response) -> dict:
    response.delete_cookie("access_token", path="/")
    return {"message": "ok"}


@router.get("/me")
async def admin_me(admin: CurrentAdmin) -> dict:
    return {"email": admin.email}


@router.post("/seed-first-user")
async def seed_first_user(
    body: SeedBody,
    db: Annotated[AsyncSession, Depends(get_db)],
    x_admin_bootstrap_token: Annotated[str | None, Header(alias="X-Admin-Bootstrap-Token")] = None,
) -> dict:
    settings = get_settings()
    if not settings.admin_bootstrap_token or x_admin_bootstrap_token != settings.admin_bootstrap_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    existing = await db.execute(select(AdminUser).limit(1))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Admin already exists")
    user = AdminUser(email=body.email, password_hash=hash_password(body.password))
    db.add(user)
    await db.commit()
    return {"email": user.email}
