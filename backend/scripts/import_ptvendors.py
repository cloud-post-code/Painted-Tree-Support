"""Import scraped ptvendors_listings.json into Vendor rows. Run after alembic upgrade.

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

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.vendor import Vendor
from app.services.vendor_product_sync import sync_vendor_legacy_from_product

DATA = Path(__file__).resolve().parents[1] / "data" / "ptvendors_listings.json"

SLUG_SCORES: dict[str, set[str]] = {
    "food": {"gourmet-food", "coffeeandtea"},
    "jewelry": {"jewelry", "gemstones-crystals"},
    "clothing": {
        "clothing",
        "womens-clothing",
        "childrens-boutique",
        "mens-gifts",
        "graphic-tees",
        "custom-t-shirts",
        "tees-tumblers",
        "shoes",
    },
    "art": {
        "wall-art",
        "handmade",
        "signs",
        "stickers",
        "custom-fabrication",
        "vintage",
        "antique",
    },
    "beauty": {"bath-body", "skincare", "aromatherapy", "wellness", "candles", "scentsy-products"},
    "home": {
        "home-decor",
        "kitchenware",
        "furniture",
        "blanketsandquilts",
        "pet-supplies",
        "gardening-supplies",
        "stationery",
        "journals",
        "holidayandreligious",
        "kitchen",
    },
}

US_STATES = {
    "alabama": "AL",
    "alaska": "AK",
    "arizona": "AZ",
    "arkansas": "AR",
    "california": "CA",
    "colorado": "CO",
    "connecticut": "CT",
    "delaware": "DE",
    "florida": "FL",
    "georgia": "GA",
    "hawaii": "HI",
    "idaho": "ID",
    "illinois": "IL",
    "indiana": "IN",
    "iowa": "IA",
    "kansas": "KS",
    "kentucky": "KY",
    "louisiana": "LA",
    "maine": "ME",
    "maryland": "MD",
    "massachusetts": "MA",
    "michigan": "MI",
    "minnesota": "MN",
    "mississippi": "MS",
    "missouri": "MO",
    "montana": "MT",
    "nebraska": "NE",
    "nevada": "NV",
    "new hampshire": "NH",
    "new jersey": "NJ",
    "new mexico": "NM",
    "new york": "NY",
    "north carolina": "NC",
    "north dakota": "ND",
    "ohio": "OH",
    "oklahoma": "OK",
    "oregon": "OR",
    "pennsylvania": "PA",
    "rhode island": "RI",
    "south carolina": "SC",
    "south dakota": "SD",
    "tennessee": "TN",
    "texas": "TX",
    "utah": "UT",
    "vermont": "VT",
    "virginia": "VA",
    "washington": "WA",
    "west virginia": "WV",
    "wisconsin": "WI",
    "wyoming": "WY",
    "district of columbia": "DC",
}


def map_category(listing: dict) -> str:
    scores: dict[str, int] = {k: 0 for k in SLUG_SCORES}
    scores["other"] = 0
    cats = listing.get("categories") or []
    slugs = {c["slug"] for c in cats if isinstance(c, dict) and c.get("slug")}
    for bucket, members in SLUG_SCORES.items():
        scores[bucket] += sum(1 for s in slugs if s in members)
    best = max(scores, key=lambda k: scores[k])
    return best if scores[best] > 0 else "other"


def guess_city_state(previous_locations: list[str] | None) -> tuple[str, str]:
    if not previous_locations:
        return "Various", "US"
    joined = ", ".join(str(x).strip() for x in previous_locations if str(x).strip())[:255]
    blob = joined.lower()
    for name, abbr in US_STATES.items():
        if name in blob:
            city = joined.split(",")[0].strip()[:255] or "Various"
            return city, abbr
    m = re.search(r",\s*([A-Za-z .]{2,30})$", joined)
    if m:
        tail = m.group(1).strip().lower()
        if tail in US_STATES:
            return joined.split(",")[0].strip()[:255] or "Various", US_STATES[tail]
    if len(previous_locations) >= 2 and len(previous_locations[1].strip()) == 2:
        return previous_locations[0].strip()[:255], previous_locations[1].strip().upper()[:8]
    return (joined[:255] if joined else "Various"), "US"


def bio_150_from(desc: str | None) -> str:
    if not desc:
        return "Painted Tree vendor — see shop links."
    one = re.sub(r"\s+", " ", desc.replace("\r\n", "\n").replace("\n", " ")).strip()
    if len(one) <= 160:
        return one
    return one[:157].rstrip() + "…"


def description_full_from(listing: dict) -> str | None:
    raw = listing.get("description")
    if not raw or not str(raw).strip():
        return None
    return str(raw).strip()


def pt_category_names_from(listing: dict) -> list[str] | None:
    cats = listing.get("categories") or []
    names: list[str] = []
    for c in cats:
        if isinstance(c, dict):
            n = (c.get("name") or "").strip()
            if n:
                names.append(n)
    return names or None


def pt_current_locations_from(listing: dict) -> list[str] | None:
    curr = listing.get("current_locations")
    if not isinstance(curr, list):
        return None
    out = [str(x).strip() for x in curr if str(x).strip()]
    return out or None


def shop_links_from(listing: dict) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    if listing.get("website"):
        out.append({"label": "Website", "url": str(listing["website"]).strip()})
    if listing.get("facebook_url"):
        out.append({"label": "Facebook", "url": str(listing["facebook_url"]).strip()})
    if listing.get("instagram_url"):
        out.append({"label": "Instagram", "url": str(listing["instagram_url"]).strip()})
    if listing.get("etsy_url"):
        out.append({"label": "Etsy", "url": str(listing["etsy_url"]).strip()})
    if listing.get("permalink") and len(out) < 4:
        out.append({"label": "PT Vendors profile", "url": str(listing["permalink"]).strip()})
    return out[:4]


def apply_listing_to_vendor(row: Vendor, listing: dict) -> None:
    prev = listing.get("previous_locations")
    if not isinstance(prev, list):
        prev = []
    prev_strs = [str(x) for x in prev]
    city, state = guess_city_state(prev_strs)
    pt_id = int(listing["id"])
    row.pt_listing_id = pt_id
    row.brand_name = str(listing.get("title") or "Vendor")[:255]
    row.category = map_category(listing)
    row.city = city[:255]
    row.state = state[:8]
    row.bio_150 = bio_150_from(listing.get("description"))
    row.description_full = description_full_from(listing)
    row.pt_category_names = pt_category_names_from(listing)
    row.pt_current_locations = pt_current_locations_from(listing)
    row.logo_url = (str(listing["logo_url"]).strip()[:2048] if listing.get("logo_url") else None)
    row.banner_url = (str(listing["banner_url"]).strip()[:2048] if listing.get("banner_url") else None)
    row.pt_previous_locations = prev_strs if prev_strs else None
    row.shop_links = shop_links_from(listing)
    row.featured = bool(listing.get("is_featured"))
    row.product_name = row.brand_name
    row.product_category = row.category
    row.product_description = row.description_full
    row.product_image = row.logo_url or row.banner_url
    row.product_brand = row.brand_name
    sync_vendor_legacy_from_product(row)


async def main() -> None:
    parser = argparse.ArgumentParser(description="Import ptvendors_listings.json into vendors table.")
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Update existing rows with matching pt_listing_id from the JSON file.",
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
            pt_id = int(listing["id"])
            exists = (
                await db.execute(select(Vendor).where(Vendor.pt_listing_id == pt_id))
            ).scalar_one_or_none()
            if exists:
                if args.refresh:
                    apply_listing_to_vendor(exists, listing)
                    updated += 1
                else:
                    skipped += 1
                continue
            row = Vendor(
                submitted_email=f"pt-import-{pt_id}@example.com",
                status="published",
            )
            apply_listing_to_vendor(row, listing)
            db.add(row)
            inserted += 1
        await db.commit()
    if args.refresh:
        print(f"Inserted {inserted} new vendors, updated {updated} from JSON, skipped {skipped} (use without --refresh for skip-only).")
    else:
        print(f"Imported {inserted} vendors, skipped {skipped} (already had pt_listing_id).")


if __name__ == "__main__":
    asyncio.run(main())
