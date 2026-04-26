"""Vendor mailing address and contact fields (ADDR/ZIP/PHONE/FAX/CONTACT/EMAIL).

Revision ID: 006_vendor_contact
Revises: 005_user_accounts
Create Date: 2026-04-26
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

import migration_helpers as mh

revision: str = "006_vendor_contact"
down_revision: str | None = "005_user_accounts"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    if not mh.column_exists("vendors", "address_line1"):
        op.add_column("vendors", sa.Column("address_line1", sa.String(length=255), nullable=True))
    if not mh.column_exists("vendors", "address_line2"):
        op.add_column("vendors", sa.Column("address_line2", sa.String(length=255), nullable=True))
    if not mh.column_exists("vendors", "postal_code"):
        op.add_column("vendors", sa.Column("postal_code", sa.String(length=32), nullable=True))
    if not mh.column_exists("vendors", "phone"):
        op.add_column("vendors", sa.Column("phone", sa.String(length=64), nullable=True))
    if not mh.column_exists("vendors", "fax"):
        op.add_column("vendors", sa.Column("fax", sa.String(length=64), nullable=True))
    if not mh.column_exists("vendors", "contact_name"):
        op.add_column("vendors", sa.Column("contact_name", sa.String(length=255), nullable=True))
    if not mh.column_exists("vendors", "contact_email"):
        op.add_column("vendors", sa.Column("contact_email", sa.String(length=255), nullable=True))


def downgrade() -> None:
    if mh.column_exists("vendors", "contact_email"):
        op.drop_column("vendors", "contact_email")
    if mh.column_exists("vendors", "contact_name"):
        op.drop_column("vendors", "contact_name")
    if mh.column_exists("vendors", "fax"):
        op.drop_column("vendors", "fax")
    if mh.column_exists("vendors", "phone"):
        op.drop_column("vendors", "phone")
    if mh.column_exists("vendors", "postal_code"):
        op.drop_column("vendors", "postal_code")
    if mh.column_exists("vendors", "address_line2"):
        op.drop_column("vendors", "address_line2")
    if mh.column_exists("vendors", "address_line1"):
        op.drop_column("vendors", "address_line1")
