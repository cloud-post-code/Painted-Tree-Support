from typing import Annotated

from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User


def _extract_token(access_token: str | None, authorization: str | None) -> str | None:
    if access_token:
        return access_token
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip() or None
    return None


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    access_token: Annotated[str | None, Cookie(alias="access_token")] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    token = _extract_token(access_token, authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    sub = decode_token(token)
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    result = await db.execute(select(User).where(User.email == sub, User.is_active.is_(True)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def get_optional_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    access_token: Annotated[str | None, Cookie(alias="access_token")] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> User | None:
    token = _extract_token(access_token, authorization)
    if not token:
        return None
    sub = decode_token(token)
    if not sub:
        return None
    result = await db.execute(select(User).where(User.email == sub, User.is_active.is_(True)))
    return result.scalar_one_or_none()


async def get_current_admin(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]
CurrentAdmin = Annotated[User, Depends(get_current_admin)]
