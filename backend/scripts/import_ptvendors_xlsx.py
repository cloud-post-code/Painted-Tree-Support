"""One-time (or repeatable) import of vendor rows from pt_vendors.xlsx into the database.

Expects columns: Name, Categories, Description, Previous PT Location, Current Location,
Logo URL, Hero/Banner URL, Website

  cd backend && pip install openpyxl   # or: pip install -e ".[dev]"
  PYTHONPATH=. python3 scripts/import_ptvendors_xlsx.py
  PYTHONPATH=. python3 scripts/import_ptvendors_xlsx.py --file /path/to/pt_vendors.xlsx --refresh
"""

from __future__ import annotations

import argparse
import asyncio
import importlib.util
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import func, select

from app.db.session import AsyncSessionLocal
from app.models.vendor import Vendor
from app.services.vendor_product_sync import sync_vendor_legacy_from_product

DEFAULT_XLSX = Path(__file__).resolve().parents[1] / "data" / "pt_vendors.xlsx"


def _load_json_importer():
    path = Path(__file__).resolve().parent / "import_ptvendors.py"
    spec = importlib.util.spec_from_file_location("_ipt", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Cannot load import_ptvendors.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_ipt = _load_json_importer()
bio_150_from = _ipt.bio_150_from
map_category = _ipt.map_category
US_STATES = _ipt.US_STATES


def is_xlsx_source_vendor(v: Vendor) -> bool:
    return (v.submitted_email or "").startswith("xlsx-import")


def cell_at(row: tuple[object, ...], i: int | None) -> object | None:
    if i is None or i >= len(row):
        return None
    return row[i]


def slug_from_label(label: str) -> str:
    s = label.lower().replace("'", "")
    s = s.replace("&", " ")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def map_category_from_categories_cell(cell: str | None) -> str:
    if not cell or not str(cell).strip():
        return "other"
    parts = [p.strip() for p in str(cell).split("|") if p.strip()]
    listing = {"categories": [{"slug": slug_from_label(p), "name": p} for p in parts]}
    return map_category(listing)


def guess_city_state_long(loc_text: str | None) -> tuple[str, str]:
    """Like guess_city_state but uses the full location string (no 255-char join cap)."""
    if not loc_text or not str(loc_text).strip():
        return "Various", "US"
    joined = str(loc_text).strip()
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
    return (joined[:255] if joined else "Various"), "US"


def parse_category_names(cell: str | None) -> list[str] | None:
    if not cell or not str(cell).strip():
        return None
    parts = [p.strip() for p in str(cell).split("|") if p.strip()]
    return parts or None


def parse_current_location(cell: str | None) -> list[str] | None:
    if cell is None or (isinstance(cell, str) and not cell.strip()):
        return None
    raw = str(cell).strip()
    raw = re.sub(r"^current:\s*", "", raw, flags=re.I).strip()
    if not raw:
        return None
    return [raw]


def norm_url(val: object) -> str | None:
    if val is None:
        return None
    s = str(val).strip()
    if not s or s.lower() == "none":
        return None
    return s[:2048]


def shop_links(website: str | None) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    w = norm_url(website)
    if w:
        out.append({"label": "Website", "url": w})
    return out


def normalize_brand_key(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip()).lower()


async def main() -> None:
    try:
        import openpyxl
    except ImportError as e:
        raise SystemExit("Install openpyxl: pip install openpyxl") from e

    ap = argparse.ArgumentParser(description="Import pt_vendors.xlsx into vendors table.")
    ap.add_argument("--file", type=Path, default=DEFAULT_XLSX, help=f"Default: {DEFAULT_XLSX}")
    ap.add_argument(
        "--refresh",
        action="store_true",
        help="Update existing rows that match the same brand name (case-insensitive, trimmed).",
    )
    args = ap.parse_args()

    if not args.file.is_file():
        raise SystemExit(f"Missing Excel file: {args.file}")

    wb = openpyxl.load_workbook(args.file, read_only=True, data_only=True)
    ws = wb.active
    rows_iter = ws.iter_rows(values_only=True)
    header = next(rows_iter, None)
    if not header:
        raise SystemExit("Empty workbook")

    idx = {str(c).strip().lower(): i for i, c in enumerate(header) if c is not None}

    def col(*names: str) -> int | None:
        for n in names:
            k = n.lower()
            if k in idx:
                return idx[k]
        return None

    i_name = col("name")
    i_cat = col("categories")
    i_desc = col("description")
    i_prev = col("previous pt location", "previous pt")
    i_curr = col("current location")
    i_logo = col("logo url", "logo")
    i_hero = col("hero/banner url", "hero/banner url", "banner url", "hero")
    i_web = col("website")
    if i_name is None:
        raise SystemExit(f"Could not find Name column in header: {header}")

    async with AsyncSessionLocal() as db:
        inserted = 0
        updated = 0
        skipped = 0
        row_no = 1
        for row in rows_iter:
            row_no += 1
            name = cell_at(row, i_name)
            if name is None or not str(name).strip():
                continue
            brand = str(name).strip()[:255]
            key = normalize_brand_key(brand)
            existing = (
                await db.execute(
                    select(Vendor).where(func.lower(func.trim(Vendor.brand_name)) == key)
                )
            ).scalar_one_or_none()

            cats_cell = cell_at(row, i_cat)
            desc = cell_at(row, i_desc)
            prev = cell_at(row, i_prev)
            curr = cell_at(row, i_curr)
            logo = cell_at(row, i_logo)
            hero = cell_at(row, i_hero)
            web = cell_at(row, i_web)

            prev_str = str(prev).strip() if prev is not None and str(prev).strip() else ""
            prev_list = [prev_str] if prev_str else None
            city, state = guess_city_state_long(prev_str if prev_str else None)

            desc_full = str(desc).strip() if desc is not None and str(desc).strip() else None
            pt_names = parse_category_names(str(cats_cell) if cats_cell is not None else None)
            curr_list = parse_current_location(curr)

            cat = map_category_from_categories_cell(str(cats_cell) if cats_cell else None)
            img = norm_url(hero) or norm_url(logo)
            payload = {
                "product_name": brand,
                "product_description": desc_full,
                "product_category": cat,
                "product_image": img,
                "product_brand": brand,
                "brand_name": brand,
                "category": cat,
                "city": city[:255],
                "state": state[:8],
                "bio_150": bio_150_from(desc_full),
                "description_full": desc_full,
                "pt_category_names": pt_names,
                "pt_current_locations": curr_list,
                "logo_url": img,
                "banner_url": img,
                "pt_previous_locations": prev_list,
                "shop_links": shop_links(web),
                "pt_listing_id": None,
                "featured": False,
            }

            if existing:
                if args.refresh and is_xlsx_source_vendor(existing):
                    for k, v in payload.items():
                        setattr(existing, k, v)
                    sync_vendor_legacy_from_product(existing)
                    if existing.status == "pending":
                        existing.status = "published"
                    updated += 1
                else:
                    skipped += 1
                continue

            v = Vendor(
                product_name=payload["product_name"],
                product_description=payload["product_description"],
                product_category=payload["product_category"],
                product_image=payload["product_image"],
                product_brand=payload["product_brand"],
                brand_name=payload["brand_name"],
                category=payload["category"],
                city=payload["city"],
                state=payload["state"],
                bio_150=payload["bio_150"],
                description_full=payload["description_full"],
                pt_category_names=payload["pt_category_names"],
                pt_current_locations=payload["pt_current_locations"],
                logo_url=payload["logo_url"],
                banner_url=payload["banner_url"],
                pt_previous_locations=payload["pt_previous_locations"],
                shop_links=payload["shop_links"],
                pt_listing_id=None,
                submitted_email=f"xlsx-import-{row_no}@example.com",
                status="published",
                featured=False,
            )
            sync_vendor_legacy_from_product(v)
            db.add(v)
            inserted += 1

        await db.commit()

    wb.close()
    if args.refresh:
        print(f"xlsx: inserted {inserted}, updated {updated}, skipped {skipped} (no --refresh on duplicate name).")
    else:
        print(f"xlsx: inserted {inserted}, skipped {skipped} (duplicate brand name).")


if __name__ == "__main__":
    asyncio.run(main())
