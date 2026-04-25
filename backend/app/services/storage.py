import uuid

import boto3
from botocore.client import Config

from app.core.config import get_settings


def upload_fileobj(fileobj, content_type: str, key_prefix: str = "uploads") -> str | None:
    settings = get_settings()
    if not all(
        [
            settings.s3_endpoint_url,
            settings.s3_access_key_id,
            settings.s3_secret_access_key,
            settings.s3_bucket_name,
        ]
    ):
        return None
    key = f"{key_prefix}/{uuid.uuid4().hex}"
    client = boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key_id,
        aws_secret_access_key=settings.s3_secret_access_key,
        config=Config(signature_version="s3v4"),
    )
    extra = {"ContentType": content_type}
    client.upload_fileobj(fileobj, settings.s3_bucket_name, key, ExtraArgs=extra)
    base = settings.s3_public_base_url or settings.s3_endpoint_url.rstrip("/")
    return f"{base}/{settings.s3_bucket_name}/{key}"
