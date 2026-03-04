from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://creet:creet@db:5432/creet"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://creet:creet@db:5432/creet"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # MinIO
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ROOT_USER: str = "creetminio"
    MINIO_ROOT_PASSWORD: str = "change-me"
    MINIO_BUCKET: str = "creet-media"
    MINIO_USE_SSL: bool = False
    MINIO_PUBLIC_URL: str = "https://creet.ai/storage"

    # Auth
    JWT_SECRET: str = "change-me-jwt-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 72
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "https://creet.ai/api/auth/google/callback"

    # Encryption
    FERNET_KEY: str = ""

    # AI Providers
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    ELEVENLABS_API_KEY: str = ""
    STABILITY_API_KEY: str = ""

    # Email
    RESEND_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@creet.ai"

    # App
    APP_NAME: str = "VideoCraft"
    APP_URL: str = "https://creet.ai"
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    POLICY_VERSION: str = "2026-03-04"

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
