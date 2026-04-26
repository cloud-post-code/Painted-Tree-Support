"""Vendor directory: logo, hero banner, PT locations, external ref.

Revision ID: 002_vendor_media
Revises: 001_initial
Create Date: 2026-04-26

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "002_vendor_media"
down_revision: str | None = "001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("vendors", sa.Column("logo_url", sa.String(length=2048), nullable=True))
    op.add_column("vendors", sa.Column("banner_url", sa.String(length=2048), nullable=True))
    op.add_column("vendors", sa.Column("pt_previous_locations", sa.JSON(), nullable=True))
    op.add_column("vendors", sa.Column("pt_listing_id", sa.Integer(), nullable=True))
    op.create_index("ix_vendors_pt_listing_id", "vendors", ["pt_listing_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_vendors_pt_listing_id", table_name="vendors")
    op.drop_column("vendors", "pt_listing_id")
    op.drop_column("vendors", "pt_previous_locations")
    op.drop_column("vendors", "banner_url")
    op.drop_column("vendors", "logo_url")
