from datetime import timedelta
from io import BytesIO

from minio import Minio

from app.config import get_settings

_client: Minio | None = None


def get_minio_client() -> Minio:
    global _client
    if _client is None:
        settings = get_settings()
        _client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ROOT_USER,
            secret_key=settings.MINIO_ROOT_PASSWORD,
            secure=settings.MINIO_USE_SSL,
        )
    return _client


def upload_file(storage_path: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    settings = get_settings()
    client = get_minio_client()
    client.put_object(
        settings.MINIO_BUCKET,
        storage_path,
        BytesIO(data),
        length=len(data),
        content_type=content_type,
    )
    return storage_path


def download_file(storage_path: str) -> bytes:
    settings = get_settings()
    client = get_minio_client()
    response = client.get_object(settings.MINIO_BUCKET, storage_path)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


def generate_presigned_url(storage_path: str, expires_hours: int = 24) -> str:
    settings = get_settings()
    client = get_minio_client()
    url = client.presigned_get_object(
        settings.MINIO_BUCKET,
        storage_path,
        expires=timedelta(hours=expires_hours),
    )
    return url


def delete_file(storage_path: str):
    settings = get_settings()
    client = get_minio_client()
    client.remove_object(settings.MINIO_BUCKET, storage_path)
