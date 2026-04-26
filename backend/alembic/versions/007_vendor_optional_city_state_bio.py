"""Allow null city, state, and short bio on vendors (optional at signup).

Revision ID: 007_vendor_optional_loc
Revises: 006_vendor_contact
Create Date: 2026-04-26
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

import migration_helpers as mh

revision: str = "007_vendor_optional_loc"
down_revision: str | None = "006_vendor_contact"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    if mh.column_exists("vendors", "city"):
        op.alter_column("vendors", "city", existing_type=sa.String(length=255), nullable=True)
    if mh.column_exists("vendors", "state"):
        op.alter_column("vendors", "state", existing_type=sa.String(length=8), nullable=True)
    if mh.column_exists("vendors", "bio_150"):
        op.alter_column("vendors", "bio_150", existing_type=sa.String(length=160), nullable=True)


def downgrade() -> None:
    op.execute(sa.text("UPDATE vendors SET city = '' WHERE city IS NULL"))
    op.execute(sa.text("UPDATE vendors SET state = '' WHERE state IS NULL"))
    op.execute(sa.text("UPDATE vendors SET bio_150 = '' WHERE bio_150 IS NULL"))
    if mh.column_exists("vendors", "bio_150"):
        op.alter_column("vendors", "bio_150", existing_type=sa.String(length=160), nullable=False)
    if mh.column_exists("vendors", "state"):
        op.alter_column("vendors", "state", existing_type=sa.String(length=8), nullable=False)
    if mh.column_exists("vendors", "city"):
        op.alter_column("vendors", "city", existing_type=sa.String(length=255), nullable=False)
