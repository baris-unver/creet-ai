from cryptography.fernet import Fernet

from app.config import get_settings


def get_fernet() -> Fernet:
    settings = get_settings()
    return Fernet(settings.FERNET_KEY.encode())


def encrypt_value(value: str) -> bytes:
    return get_fernet().encrypt(value.encode())


def decrypt_value(encrypted: bytes) -> str:
    return get_fernet().decrypt(encrypted).decode()
