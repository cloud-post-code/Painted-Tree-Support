"""Resize / normalize vendor logo and banner uploads (JPEG out)."""

from __future__ import annotations

import os
import uuid
from io import BytesIO
from urllib.parse import urlparse

from PIL import Image, ImageOps

from app.core.config import get_settings
from app.services.storage import upload_fileobj

LOGO_SIZE = (512, 512)
BANNER_SIZE = (1200, 600)
BANNER_RATIO = BANNER_SIZE[0] / BANNER_SIZE[1]  # 2:1
MAX_BYTES_IN = 12 * 1024 * 1024


def process_vendor_image(data: bytes, kind: str) -> bytes:
    if kind not in ("logo", "banner"):
        raise ValueError("kind must be logo or banner")
    if len(data) > MAX_BYTES_IN:
        raise ValueError("file too large")
    im = Image.open(BytesIO(data))
    im = ImageOps.exif_transpose(im)
    if im.mode in ("RGBA", "P"):
        im = im.convert("RGB")
    elif im.mode != "RGB":
        im = im.convert("RGB")

    w, h = im.size
    if kind == "logo":
        side = min(w, h)
        left = (w - side) // 2
        top = (h - side) // 2
        im = im.crop((left, top, left + side, top + side))
        im = im.resize(LOGO_SIZE, Image.Resampling.LANCZOS)
    else:
        cur = w / h
        if cur > BANNER_RATIO:
            new_w = int(round(h * BANNER_RATIO))
            left = (w - new_w) // 2
            im = im.crop((left, 0, left + new_w, h))
        elif cur < BANNER_RATIO:
            new_h = int(round(w / BANNER_RATIO))
            top = (h - new_h) // 2
            im = im.crop((0, top, w, top + new_h))
        im = im.resize(BANNER_SIZE, Image.Resampling.LANCZOS)

    out = BytesIO()
    im.save(out, format="JPEG", quality=88, optimize=True)
    return out.getvalue()


def save_vendor_jpeg(jpeg_bytes: bytes) -> str:
    """Persist processed JPEG; returns public URL path or absolute URL."""
    buf = BytesIO(jpeg_bytes)
    url = upload_fileobj(buf, "image/jpeg", "vendor-uploads")
    if url:
        return url
    return _save_vendor_jpeg_local(jpeg_bytes)


def _save_vendor_jpeg_local(jpeg_bytes: bytes) -> str:
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "static", "uploads", "vendors"))
    os.makedirs(base_dir, exist_ok=True)
    name = f"{uuid.uuid4().hex}.jpg"
    path = os.path.join(base_dir, name)
    with open(path, "wb") as f:
        f.write(jpeg_bytes)
    return f"/static/uploads/vendors/{name}"


def allowed_vendor_asset_url(url: str | None) -> bool:
    """Allow hosted uploads, S3, or public http(s) image URLs (for pasted links)."""
    if not url or not str(url).strip():
        return True
    u = str(url).strip()
    if u.startswith("/static/uploads/vendors/"):
        return True
    settings = get_settings()
    pub = (settings.s3_public_base_url or "").rstrip("/")
    if pub and u.startswith(pub + "/"):
        return True
    if pub and u.startswith(pub):
        return True
    endpoint = (settings.s3_endpoint_url or "").rstrip("/")
    bucket = settings.s3_bucket_name or ""
    if endpoint and bucket and f"/{bucket}/" in u:
        return True
    if u.startswith("http://") or u.startswith("https://"):
        p = urlparse(u)
        if p.scheme in ("http", "https") and p.netloc:
            return True
    return False
