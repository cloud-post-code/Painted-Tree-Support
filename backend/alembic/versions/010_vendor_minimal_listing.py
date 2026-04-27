"""Vendor minimal listing: 8-field canonical model (name, categories, description, previous_pt_location, current_location, logo_url, hero_url, website).

Wipes the vendors table and drops every column outside the canonical eight (plus the
operational fields ``status``/``featured``/``submitted_email``/``user_id``/``removal_token``/timestamps).
The fresh schema is repopulated by the admin CSV importer in
``backend/app/api/v1/admin_manage.py`` using ``pt_vendors.csv``.

Revision ID: 010_vendor_minimal_listing
Revises: 009_vendor_product_sheet
Create Date: 2026-04-27
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

import migration_helpers as mh

revision: str = "010_vendor_minimal_listing"
down_revision: str | None = "009_vendor_product_sheet"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Columns the new vendor model owns. ``logo_url`` already exists from earlier
# migrations and is reused.
NEW_COLUMNS: list[tuple[str, sa.types.TypeEngine, bool]] = [
    ("name", sa.String(255), True),
    ("categories", sa.JSON(), True),
    ("description", sa.Text(), True),
    ("previous_pt_location", sa.Text(), True),
    ("current_location", sa.Text(), True),
    ("hero_url", sa.String(2048), True),
    ("website", sa.String(2048), True),
]


# Everything dropped from the old "product sheet" + legacy directory schema. The
# table is truncated first so dropping ``NOT NULL`` columns is safe.
DROP_COLUMNS: list[str] = [
    "product_name",
    "product_description",
    "product_price",
    "product_category",
    "product_stock",
    "product_image",
    "product_brand",
    "product_rating",
    "brand_name",
    "category",
    "city",
    "state",
    "address_line1",
    "address_line2",
    "postal_code",
    "phone",
    "fax",
    "contact_name",
    "contact_email",
    "bio_150",
    "description_full",
    "pt_category_names",
    "pt_current_locations",
    "pt_previous_locations",
    "pt_listing_id",
    "banner_url",
    "shop_links",
]


def upgrade() -> None:
    if not mh.table_exists("vendors"):
        return

    op.execute("TRUNCATE TABLE vendors RESTART IDENTITY CASCADE")

    for col_name, col_type, nullable in NEW_COLUMNS:
        if not mh.column_exists("vendors", col_name):
            op.add_column("vendors", sa.Column(col_name, col_type, nullable=nullable))

    if not mh.index_exists("vendors", "ix_vendors_name"):
        op.create_index("ix_vendors_name", "vendors", ["name"])

    op.alter_column("vendors", "name", existing_type=sa.String(255), nullable=False)

    for col_name in DROP_COLUMNS:
        if mh.column_exists("vendors", col_name):
            op.drop_column("vendors", col_name)


def downgrade() -> None:
    if not mh.table_exists("vendors"):
        return

    if mh.index_exists("vendors", "ix_vendors_name"):
        op.drop_index("ix_vendors_name", table_name="vendors")

    for col_name, _typ, _nullable in reversed(NEW_COLUMNS):
        if mh.column_exists("vendors", col_name):
            op.drop_column("vendors", col_name)
