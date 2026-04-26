"""Create the first admin user or upsert credentials by email.

Examples:

  cd backend && PYTHONPATH=. python scripts/seed_admin.py \\
    --email admin@example.com --password 'your-secure-password'

  # Same as HTTP bootstrap: only if no admin exists yet
  ADMIN_SEED_EMAIL=... ADMIN_SEED_PASSWORD=... PYTHONPATH=. python scripts/seed_admin.py

  # Create or reset password for that email (multiple admins allowed)
  ADMIN_SEED_EMAIL=... ADMIN_SEED_PASSWORD=... PYTHONPATH=. python scripts/seed_admin.py --upsert

Railway: link the app service, then (repo root)::

  railway run -- sh -c 'cd backend && PYTHONPATH=. python scripts/seed_admin.py --upsert'

Uses ADMIN_EMAIL / ADMIN_PASSWORD from the environment when ADMIN_SEED_* is unset.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.user import User


def _resolve_credentials(args: argparse.Namespace) -> tuple[str, str]:
    email = (
        args.email
        or os.environ.get("ADMIN_SEED_EMAIL")
        or os.environ.get("ADMIN_EMAIL")
        or ""
    ).strip().lower()
    password = (
        args.password
        or os.environ.get("ADMIN_SEED_PASSWORD")
        or os.environ.get("ADMIN_PASSWORD")
        or ""
    )
    if not email or not password:
        raise SystemExit(
            "Missing email/password: use --email/--password or set "
            "ADMIN_SEED_EMAIL + ADMIN_SEED_PASSWORD (or ADMIN_EMAIL + ADMIN_PASSWORD)."
        )
    if len(password) < 8:
        raise SystemExit("Password must be at least 8 characters.")
    return email, password


async def main() -> None:
    parser = argparse.ArgumentParser(description="Seed an admin user (users.is_admin=true).")
    parser.add_argument("--email", default=None, help="Admin email (or ADMIN_SEED_EMAIL / ADMIN_EMAIL)")
    parser.add_argument("--password", default=None, help="Plain password (or ADMIN_SEED_PASSWORD / ADMIN_PASSWORD)")
    parser.add_argument(
        "--upsert",
        action="store_true",
        help="Insert or update password for --email. Without this flag, aborts if any admin already exists.",
    )
    args = parser.parse_args()
    email, password = _resolve_credentials(args)

    async with AsyncSessionLocal() as db:
        if not args.upsert:
            any_admin = (
                await db.execute(select(User).where(User.is_admin.is_(True)).limit(1))
            ).scalar_one_or_none()
            if any_admin:
                print("An admin user already exists. Use --upsert to create/reset a specific email.")
                return

        existing = (
            await db.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()
        if existing:
            if not args.upsert:
                print(f"User {email!r} already exists. Pass --upsert to reset the password / promote to admin.")
                return
            existing.password_hash = hash_password(password)
            existing.is_active = True
            existing.is_admin = True
            await db.commit()
            print(f"Updated admin {email!r}.")
            return

        db.add(
            User(
                email=email,
                password_hash=hash_password(password),
                is_admin=True,
                is_active=True,
                email_verified=True,
            )
        )
        await db.commit()
        print(f"Created admin {email!r}.")


if __name__ == "__main__":
    asyncio.run(main())
