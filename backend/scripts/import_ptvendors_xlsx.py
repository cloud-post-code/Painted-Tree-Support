"""Import vendor rows from ``pt_vendors.xlsx`` into the canonical 8-field model.

Expected columns: Name, Categories, Description, Previous PT Location, Current Location,
Logo URL, Hero/Banner URL, Website.

Categories are split on ``|``, ``,``, or newline.
Existing rows are matched case-insensitively by ``Name``.

For ad-hoc imports prefer the admin CSV importer at
``POST /api/v1/admin/manage/vendors/import-csv`` (or "Upload & import" on
``/admin/vendors``). This script remains for the recurring xlsx workflow.

Usage::

    cd backend && pip install openpyxl
    PYTHONPATH=. python3 scripts/import_ptvendors_xlsx.py
    PYTHONPATH=. python3 scripts/import_ptvendors_xlsx.py --file /path/to/pt_vendors.xlsx --refresh
"""

from __future__ import annotations

import argparse
import asyncio
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import func, select

from app.db.session import AsyncSessionLocal
from app.models.vendor import Vendor

DEFAULT_XLSX = Path(__file__).resolve().parents[1] / "data" / "pt_vendors.xlsx"


def cell_at(row: tuple[object, ...], i: int | None) -> object | None:
    if i is None or i >= len(row):
        return None
    return row[i]


def split_categories(cell: object | None) -> list[str]:
    if cell is None:
        return []
    raw = str(cell).strip()
    if not raw:
        return []
    raw = raw.replace("\r", "\n")
    for sep in ("|", "\n", ","):
        raw = raw.replace(sep, "|")
    parts = [p.strip() for p in raw.split("|") if p.strip()]
    out: list[str] = []
    seen: set[str] = set()
    for p in parts:
        key = p.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(p[:120])
        if len(out) >= 16:
            break
    return out


def cell_text(cell: object | None) -> str | None:
    if cell is None:
        return None
    text = re.sub(r"\s+\n", "\n", str(cell)).strip()
    return text or None


def norm_url(val: object | None) -> str | None:
    if val is None:
        return None
    s = str(val).strip()
    if not s or s.lower() == "none":
        return None
    return s[:2048]


def normalize_name(name: str) -> str:
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
        help="Update existing rows that match the same name (case-insensitive, trimmed).",
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
    i_hero = col("hero/banner url", "hero url", "banner url", "hero")
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
            display_name = str(name).strip()[:255]
            key = normalize_name(display_name)
            existing = (
                await db.execute(
                    select(Vendor).where(func.lower(func.trim(Vendor.name)) == key)
                )
            ).scalar_one_or_none()

            payload = {
                "name": display_name,
                "categories": split_categories(cell_at(row, i_cat)),
                "description": cell_text(cell_at(row, i_desc)),
                "previous_pt_location": cell_text(cell_at(row, i_prev)),
                "current_location": cell_text(cell_at(row, i_curr)),
                "logo_url": norm_url(cell_at(row, i_logo)),
                "hero_url": norm_url(cell_at(row, i_hero)),
                "website": norm_url(cell_at(row, i_web)),
            }

            if existing:
                if args.refresh:
                    for k, v in payload.items():
                        setattr(existing, k, v)
                    if existing.status == "pending":
                        existing.status = "published"
                    updated += 1
                else:
                    skipped += 1
                continue

            db.add(
                Vendor(
                    submitted_email=f"xlsx-import-{row_no}@invalid",
                    status="published",
                    featured=False,
                    **payload,
                )
            )
            inserted += 1

        await db.commit()

    wb.close()
    if args.refresh:
        print(f"xlsx: inserted {inserted}, updated {updated}, skipped {skipped}.")
    else:
        print(f"xlsx: inserted {inserted}, skipped {skipped} (duplicate name; rerun with --refresh to update).")


if __name__ == "__main__":
    asyncio.run(main())
