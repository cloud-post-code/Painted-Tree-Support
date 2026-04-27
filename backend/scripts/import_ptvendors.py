"""Import scraped ptvendors_listings.json into Vendor rows (canonical 8-field model).

The vendor table now stores exactly:
``name``, ``categories``, ``description``, ``previous_pt_location``,
``current_location``, ``logo_url``, ``hero_url``, ``website``
(plus the operational fields ``status``/``featured``/``submitted_email``).

For ad-hoc admin imports prefer the canonical CSV importer at
``POST /api/v1/admin/manage/vendors/import-csv`` (or the "Upload & import" button on
``/admin/vendors``). This script remains for the recurring scraper job.

Usage::

    cd backend && PYTHONPATH=. python scripts/import_ptvendors.py
    cd backend && PYTHONPATH=. python scripts/import_ptvendors.py --refresh
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import func, select

from app.db.session import AsyncSessionLocal
from app.models.vendor import Vendor

DATA = Path(__file__).resolve().parents[1] / "data" / "ptvendors_listings.json"


def _categories_from(listing: dict) -> list[str]:
    cats = listing.get("categories") or []
    out: list[str] = []
    seen: set[str] = set()
    for c in cats:
        if isinstance(c, dict):
            n = (c.get("name") or "").strip()
        else:
            n = str(c).strip()
        if not n:
            continue
        key = n.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(n[:120])
        if len(out) >= 16:
            break
    return out


def _join_locations(values) -> str | None:
    if not isinstance(values, list):
        return None
    parts = [re.sub(r"\s+", " ", str(x)).strip() for x in values if str(x).strip()]
    return " | ".join(parts) if parts else None


def _website_from(listing: dict) -> str | None:
    for key in ("website", "etsy_url", "instagram_url", "facebook_url", "permalink"):
        v = listing.get(key)
        if v and str(v).strip():
            return str(v).strip()[:2048]
    return None


def _description_from(listing: dict) -> str | None:
    raw = listing.get("description")
    if not raw or not str(raw).strip():
        return None
    return str(raw).strip()


def apply_listing_to_vendor(row: Vendor, listing: dict) -> None:
    row.name = str(listing.get("title") or "Vendor")[:255]
    row.categories = _categories_from(listing)
    row.description = _description_from(listing)
    row.previous_pt_location = _join_locations(listing.get("previous_locations"))
    row.current_location = _join_locations(listing.get("current_locations"))
    row.logo_url = str(listing["logo_url"]).strip()[:2048] if listing.get("logo_url") else None
    row.hero_url = str(listing["banner_url"]).strip()[:2048] if listing.get("banner_url") else None
    row.website = _website_from(listing)
    row.featured = bool(listing.get("is_featured"))


async def main() -> None:
    parser = argparse.ArgumentParser(description="Import ptvendors_listings.json into vendors table.")
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Update existing rows with matching name (case-insensitive) from the JSON file.",
    )
    args = parser.parse_args()

    if not DATA.is_file():
        raise SystemExit(f"Missing {DATA} — run scripts/scrape_ptvendors.py first")
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    listings: list[dict] = payload["listings"]
    async with AsyncSessionLocal() as db:
        inserted = 0
        skipped = 0
        updated = 0
        for listing in listings:
            name = str(listing.get("title") or "").strip()
            if not name:
                skipped += 1
                continue
            existing = (
                await db.execute(select(Vendor).where(func.lower(Vendor.name) == name.lower()))
            ).scalars().first()
            if existing:
                if args.refresh:
                    apply_listing_to_vendor(existing, listing)
                    updated += 1
                else:
                    skipped += 1
                continue
            row = Vendor(
                submitted_email=f"pt-import-{name.lower().replace(' ', '-')[:60]}@invalid",
                status="published",
            )
            apply_listing_to_vendor(row, listing)
            db.add(row)
            inserted += 1
        await db.commit()
    if args.refresh:
        print(f"Inserted {inserted} new vendors, updated {updated}, skipped {skipped}.")
    else:
        print(f"Imported {inserted} vendors, skipped {skipped} (existing or unnamed).")


if __name__ == "__main__":
    asyncio.run(main())
