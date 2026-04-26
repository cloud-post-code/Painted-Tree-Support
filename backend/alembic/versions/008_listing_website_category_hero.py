"""Listings: website URL, category, hero (OG) image.

Revision ID: 008_listing_web_hero
Revises: 007_vendor_optional_loc
Create Date: 2026-04-26
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

import migration_helpers as mh

revision: str = "008_listing_web_hero"
down_revision: str | None = "007_vendor_optional_loc"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    if not mh.column_exists("listings", "website_url"):
        op.add_column("listings", sa.Column("website_url", sa.String(length=2048), nullable=True))
    if not mh.column_exists("listings", "category"):
        op.add_column(
            "listings",
            sa.Column("category", sa.String(length=64), nullable=False, server_default="general"),
        )
    if not mh.column_exists("listings", "hero_image_url"):
        op.add_column("listings", sa.Column("hero_image_url", sa.String(length=2048), nullable=True))


def downgrade() -> None:
    if mh.column_exists("listings", "hero_image_url"):
        op.drop_column("listings", "hero_image_url")
    if mh.column_exists("listings", "category"):
        op.drop_column("listings", "category")
    if mh.column_exists("listings", "website_url"):
        op.drop_column("listings", "website_url")
