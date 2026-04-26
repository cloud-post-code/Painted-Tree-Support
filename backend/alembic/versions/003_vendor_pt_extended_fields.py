"""Vendor PT import: full description, category labels, current locations.

Revision ID: 003_vendor_pt_ext
Revises: 002_vendor_media
Create Date: 2026-04-26

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "003_vendor_pt_ext"
down_revision: str | None = "002_vendor_media"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("vendors", sa.Column("description_full", sa.Text(), nullable=True))
    op.add_column("vendors", sa.Column("pt_category_names", sa.JSON(), nullable=True))
    op.add_column("vendors", sa.Column("pt_current_locations", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("vendors", "pt_current_locations")
    op.drop_column("vendors", "pt_category_names")
    op.drop_column("vendors", "description_full")
