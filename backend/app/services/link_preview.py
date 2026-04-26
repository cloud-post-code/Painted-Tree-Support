"""Fetch Open Graph / Twitter hero image URLs from public web pages (SSRF-aware)."""

from __future__ import annotations

import ipaddress
import re
from urllib.parse import urljoin, urlparse

import httpx

_MAX_HTML_BYTES = 400_000
_USER_AGENT = "ProjectRePaintBot/1.0 (listings link preview; crisis vendor support platform)"

# Match og:image and twitter:image variants (property/content order varies).
_OG_CONTENT_PATTERNS = (
    re.compile(
        r'<meta[^>]+property\s*=\s*["\']og:image["\'][^>]+content\s*=\s*["\']([^"\']+)["\']',
        re.IGNORECASE | re.DOTALL,
    ),
    re.compile(
        r'<meta[^>]+content\s*=\s*["\']([^"\']+)["\'][^>]+property\s*=\s*["\']og:image["\']',
        re.IGNORECASE | re.DOTALL,
    ),
    re.compile(
        r'<meta[^>]+name\s*=\s*["\']twitter:image["\'][^>]+content\s*=\s*["\']([^"\']+)["\']',
        re.IGNORECASE | re.DOTALL,
    ),
    re.compile(
        r'<meta[^>]+name\s*=\s*["\']twitter:image:src["\'][^>]+content\s*=\s*["\']([^"\']+)["\']',
        re.IGNORECASE | re.DOTALL,
    ),
    re.compile(
        r'<meta[^>]+content\s*=\s*["\']([^"\']+)["\'][^>]+name\s*=\s*["\']twitter:image:src["\']',
        re.IGNORECASE | re.DOTALL,
    ),
)


def _hostname_blocked(host: str) -> bool:
    h = host.lower().strip(".")
    if not h or h == "localhost":
        return True
    if h in ("0.0.0.0", "169.254.169.254", "metadata.google.internal"):
        return True
    if h.endswith(".local") or h.endswith(".localhost"):
        return True
    try:
        ip = ipaddress.ip_address(h)
        return ip.is_private or ip.is_loopback or ip.is_link_local or not ip.is_global
    except ValueError:
        return False


def is_safe_public_url(url: str) -> bool:
    try:
        parsed = urlparse(url.strip())
    except Exception:
        return False
    if parsed.scheme not in ("http", "https"):
        return False
    host = parsed.hostname
    if not host:
        return False
    return not _hostname_blocked(host)


def normalize_page_url(raw: str) -> str | None:
    s = (raw or "").strip()
    if not s:
        return None
    if not s.startswith(("http://", "https://")):
        s = "https://" + s
    if not is_safe_public_url(s):
        return None
    return s


def _extract_image_from_html(html: str, base_url: str) -> str | None:
    for pat in _OG_CONTENT_PATTERNS:
        m = pat.search(html)
        if m:
            raw = (m.group(1) or "").strip()
            if not raw:
                continue
            resolved = urljoin(base_url, raw)
            if is_safe_public_url(resolved):
                return resolved[:2048]
    return None


async def fetch_hero_image_url(page_url: str) -> str | None:
    """Return absolute og/twitter image URL, or None."""
    if not is_safe_public_url(page_url):
        return None
    headers = {"User-Agent": _USER_AGENT, "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8"}
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(10.0, connect=5.0),
            follow_redirects=True,
            headers=headers,
        ) as client:
            async with client.stream("GET", page_url) as resp:
                if resp.status_code >= 400:
                    return None
                buf = bytearray()
                async for chunk in resp.aiter_bytes():
                    buf.extend(chunk)
                    if len(buf) >= _MAX_HTML_BYTES:
                        break
        text = bytes(buf).decode("utf-8", errors="replace")
        return _extract_image_from_html(text, page_url)
    except (httpx.HTTPError, OSError, UnicodeError):
        return None
