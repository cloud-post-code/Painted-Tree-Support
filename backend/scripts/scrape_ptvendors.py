"""Fetch all listings from ptvendors.com (WordPress pt_bd_search AJAX)."""

from __future__ import annotations

import html as html_lib
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlencode

BASE = "https://ptvendors.com"
AJAX = f"{BASE}/wp-admin/admin-ajax.php"
UA = "Mozilla/5.0 (compatible; VRR-import/1.0; +https://example.org)"
OUT = Path(__file__).resolve().parents[1] / "data" / "ptvendors_listings.json"


def http_get(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read().decode("utf-8", "replace")


def http_post(url: str, body: bytes) -> dict:
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def extract_nonce(home_html: str) -> str:
    m = re.search(r'"nonce":"([^"]+)"', home_html)
    if not m:
        raise RuntimeError("Could not find ptBdData nonce on homepage")
    return m.group(1)


def parse_listings_from_results_html(fragment: str) -> dict[int, dict]:
    out: dict[int, dict] = {}
    for m in re.finditer(r'data-listing="([^"]+)"', fragment):
        raw = html_lib.unescape(m.group(1))
        obj = json.loads(raw)
        out[int(obj["id"])] = obj
    return out


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    home = http_get(f"{BASE}/")
    nonce = extract_nonce(home)
    body0 = urlencode(
        {
            "action": "pt_bd_search",
            "nonce": nonce,
            "keyword": "",
            "category": "",
            "prev_location": "",
            "curr_location": "",
            "orderby": "newest",
            "paged": "1",
        }
    ).encode()
    first = http_post(AJAX, body0)
    if not first.get("success"):
        print(first, file=sys.stderr)
        raise SystemExit("pt_bd_search page 1 failed")
    data = first["data"]
    total = int(data["total"])
    total_pages = int(data.get("total_pages") or 1)
    merged: dict[int, dict] = {}
    merged.update(parse_listings_from_results_html(data.get("html") or ""))
    print(f"page 1/{total_pages}: +{len(merged)} cards (total listings={total})")

    for p in range(2, total_pages + 1):
        time.sleep(0.35)
        body = urlencode(
            {
                "action": "pt_bd_search",
                "nonce": nonce,
                "keyword": "",
                "category": "",
                "prev_location": "",
                "curr_location": "",
                "orderby": "newest",
                "paged": str(p),
            }
        ).encode()
        try:
            res = http_post(AJAX, body)
        except urllib.error.HTTPError as e:
            print(f"HTTP error page {p}: {e}", file=sys.stderr)
            raise
        if not res.get("success"):
            print(res, file=sys.stderr)
            raise SystemExit(f"pt_bd_search page {p} failed")
        chunk = parse_listings_from_results_html(res["data"].get("html") or "")
        merged.update(chunk)
        print(f"page {p}/{total_pages}: +{len(chunk)} (unique ids={len(merged)})")

    rows = sorted(merged.values(), key=lambda x: x["id"])
    payload = {
        "source": BASE,
        "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total": len(rows),
        "listings": rows,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(rows)} listings to {OUT}")


if __name__ == "__main__":
    main()
