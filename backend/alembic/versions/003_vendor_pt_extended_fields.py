"""Vendor PT import: full description, category labels, current locations.

Revision ID: 003_vendor_pt_ext
Revises: 002_vendor_media
Create Date: 2026-04-26

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

import migration_helpers as mh

revision: str = "003_vendor_pt_ext"
down_revision: str | None = "002_vendor_media"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    if not mh.column_exists("vendors", "description_full"):
        op.add_column("vendors", sa.Column("description_full", sa.Text(), nullable=True))
    if not mh.column_exists("vendors", "pt_category_names"):
        op.add_column("vendors", sa.Column("pt_category_names", sa.JSON(), nullable=True))
    if not mh.column_exists("vendors", "pt_current_locations"):
        op.add_column("vendors", sa.Column("pt_current_locations", sa.JSON(), nullable=True))


def downgrade() -> None:
    if mh.column_exists("vendors", "pt_current_locations"):
        op.drop_column("vendors", "pt_current_locations")
    if mh.column_exists("vendors", "pt_category_names"):
        op.drop_column("vendors", "pt_category_names")
    if mh.column_exists("vendors", "description_full"):
        op.drop_column("vendors", "description_full")
