"""Keep legacy vendor directory columns aligned with the eight product_* fields."""

from __future__ import annotations

from app.models.vendor import Vendor


def sync_vendor_legacy_from_product(v: Vendor) -> None:
    """Mirror product sheet onto brand_name / category / description / images for indexes and old queries."""
    name = (v.product_name or "").strip() or (v.brand_name or "").strip() or "Vendor"
    v.product_name = name[:255]
    v.brand_name = name[:255]

    cat = (v.product_category or "").strip() or "other"
    v.product_category = cat[:64]
    v.category = cat[:64]

    v.description_full = v.product_description
    if v.product_description:
        v.bio_150 = str(v.product_description)[:160]
    else:
        v.bio_150 = None

    img = (v.product_image or "").strip()[:2048] or None
    v.product_image = img
    v.logo_url = img
    v.banner_url = img
