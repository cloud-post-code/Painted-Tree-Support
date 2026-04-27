"""Vendor product sheet: eight product_* columns (name, description, price, category, stock, image, brand, rating).

Revision ID: 009_vendor_product_sheet
Revises: 008_listing_web_hero
Create Date: 2026-04-27
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

import migration_helpers as mh

revision: str = "009_vendor_product_sheet"
down_revision: str | None = "008_listing_web_hero"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    cols: list[tuple[str, sa.types.TypeEngine]] = [
        ("product_name", sa.String(255)),
        ("product_description", sa.Text()),
        ("product_price", sa.String(64)),
        ("product_category", sa.String(64)),
        ("product_stock", sa.String(32)),
        ("product_image", sa.String(2048)),
        ("product_brand", sa.String(255)),
        ("product_rating", sa.String(32)),
    ]
    for name, typ in cols:
        if not mh.column_exists("vendors", name):
            op.add_column("vendors", sa.Column(name, typ, nullable=True))

    op.execute(
        """
        UPDATE vendors
        SET product_name = COALESCE(NULLIF(TRIM(product_name), ''), NULLIF(TRIM(brand_name), ''), 'Vendor')
        WHERE product_name IS NULL OR TRIM(product_name) = '';
        """
    )
    op.execute(
        """
        UPDATE vendors
        SET product_brand = COALESCE(NULLIF(TRIM(product_brand), ''), NULLIF(TRIM(brand_name), ''))
        WHERE product_brand IS NULL OR TRIM(product_brand) = '';
        """
    )
    op.execute(
        """
        UPDATE vendors
        SET product_description = COALESCE(
            NULLIF(BTRIM(CAST(product_description AS TEXT)), ''),
            description_full,
            bio_150
        )
        WHERE product_description IS NULL OR BTRIM(CAST(product_description AS TEXT)) = '';
        """
    )
    op.execute(
        """
        UPDATE vendors
        SET product_category = COALESCE(
            NULLIF(TRIM(product_category), ''),
            NULLIF(TRIM(category), ''),
            'other'
        )
        WHERE product_category IS NULL OR TRIM(product_category) = '';
        """
    )
    op.execute(
        """
        UPDATE vendors
        SET product_image = COALESCE(
            NULLIF(TRIM(product_image), ''),
            NULLIF(TRIM(banner_url), ''),
            NULLIF(TRIM(logo_url), '')
        )
        WHERE product_image IS NULL OR TRIM(product_image) = '';
        """
    )

    op.alter_column("vendors", "product_name", existing_type=sa.String(255), nullable=False)
    op.alter_column("vendors", "product_category", existing_type=sa.String(64), nullable=False)


def downgrade() -> None:
    for name in (
        "product_rating",
        "product_brand",
        "product_image",
        "product_stock",
        "product_category",
        "product_price",
        "product_description",
        "product_name",
    ):
        if mh.column_exists("vendors", name):
            op.drop_column("vendors", name)
