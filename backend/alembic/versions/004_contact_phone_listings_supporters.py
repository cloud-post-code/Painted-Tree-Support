"""Optional contact phone for listings and supporter offers.

Revision ID: 004_contact_phone
Revises: 003_vendor_pt_ext
Create Date: 2026-04-26

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "004_contact_phone"
down_revision: str | None = "003_vendor_pt_ext"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("listings", sa.Column("contact_phone", sa.String(length=64), nullable=True))
    op.add_column("space_offers", sa.Column("contact_phone", sa.String(length=64), nullable=True))
    op.add_column("service_offers", sa.Column("contact_phone", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("service_offers", "contact_phone")
    op.drop_column("space_offers", "contact_phone")
    op.drop_column("listings", "contact_phone")
