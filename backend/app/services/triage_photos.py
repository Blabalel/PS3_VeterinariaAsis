"""Private storage for photos attached to clinical reports."""
from functools import lru_cache
from io import BytesIO
from pathlib import Path
import re
from uuid import uuid4

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException
from PIL import Image

from app.core.config import settings

MAX_PHOTO_BYTES = 8 * 1024 * 1024
IMAGE_TYPES = {"JPEG": ("jpg", "image/jpeg"), "PNG": ("png", "image/png"), "WEBP": ("webp", "image/webp")}
LEGACY_TYPES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
OBJECT_KEY = re.compile(r"triaje/[a-f0-9]{32}\.(jpg|png|webp)")


@lru_cache(maxsize=1)
def s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        config=Config(
            connect_timeout=2,
            read_timeout=4,
            retries={"total_max_attempts": 1},
            s3={"addressing_style": "path" if settings.s3_endpoint_url else "auto"},
        ),
    )


def check_photo_storage():
    if settings.s3_bucket:
        s3_client().head_bucket(Bucket=settings.s3_bucket)


def store_photo(data: bytes) -> str:
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(status_code=413, detail="La foto supera 8 MB.")
    try:
        with Image.open(BytesIO(data), formats=list(IMAGE_TYPES)) as image:
            extension, media_type = IMAGE_TYPES[image.format]
            image.verify()
    except (KeyError, OSError, SyntaxError, ValueError, Image.DecompressionBombError) as exc:
        raise HTTPException(status_code=422, detail="Adjunta una imagen JPEG, PNG o WebP válida.") from exc

    key = f"triaje/{uuid4().hex}.{extension}"
    if not settings.s3_bucket:
        directory = settings.nuevas_dir
        directory.mkdir(parents=True, exist_ok=True)
        (directory / Path(key).name).write_bytes(data)
        return f"/dataset/nuevas/{Path(key).name}"

    try:
        s3_client().put_object(Bucket=settings.s3_bucket, Key=key, Body=data, ContentType=media_type)
    except (BotoCoreError, ClientError) as exc:
        raise HTTPException(status_code=503, detail="No se pudo guardar la fotografía. Intenta de nuevo.") from exc
    return f"s3:{key}"


def read_photo(reference: str) -> tuple[bytes, str]:
    if reference.startswith("s3:") and settings.s3_bucket and OBJECT_KEY.fullmatch(reference[3:]):
        key = reference[3:]
        try:
            result = s3_client().get_object(Bucket=settings.s3_bucket, Key=key)
            with result["Body"] as body:
                data = body.read(MAX_PHOTO_BYTES + 1)
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") in {"NoSuchKey", "404", "NotFound"}:
                raise HTTPException(status_code=404, detail="Fotografía no encontrada.") from exc
            raise HTTPException(status_code=503, detail="No se pudo consultar la fotografía.") from exc
        except BotoCoreError as exc:
            raise HTTPException(status_code=503, detail="No se pudo consultar la fotografía.") from exc
        if len(data) <= MAX_PHOTO_BYTES:
            return data, LEGACY_TYPES[Path(key).suffix]
    else:
        match = re.fullmatch(r"(?:\.\./|/)?dataset/nuevas/([A-Za-z0-9._-]+)", reference)
        if match:
            filename = match[1]
            media_type = LEGACY_TYPES.get(Path(filename).suffix.lower())
            path = (settings.nuevas_dir / filename).resolve()
            if media_type and path.parent == settings.nuevas_dir.resolve() and path.is_file():
                with path.open("rb") as photo:
                    data = photo.read(MAX_PHOTO_BYTES + 1)
                if len(data) <= MAX_PHOTO_BYTES:
                    return data, media_type
    raise HTTPException(status_code=404, detail="Fotografía no encontrada.")


def photo_url(caso) -> str | None:
    return f"/api/historial/{caso.id}/foto" if caso.foto_url else None
