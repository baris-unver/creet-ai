from sqlalchemy.orm import Session
from sqlalchemy import select

from app.config import get_settings
from app.models.team import TeamSettings
from app.providers.llm.base import LLMProvider
from app.providers.llm.openai import OpenAIProvider
from app.providers.llm.anthropic import AnthropicProvider
from app.providers.llm.gemini import GeminiProvider
from app.providers.image.base import ImageProvider
from app.providers.image.dalle import DalleProvider
from app.providers.image.stability import StabilityProvider
from app.providers.tts.base import TTSProvider
from app.providers.tts.elevenlabs import ElevenLabsProvider
from app.providers.tts.openai_tts import OpenAITTSProvider
from app.utils.encryption import decrypt_value

LLM_PROVIDERS = {
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
    "gemini": GeminiProvider,
}

IMAGE_PROVIDERS = {
    "dalle": DalleProvider,
    "stability": StabilityProvider,
}

TTS_PROVIDERS = {
    "elevenlabs": ElevenLabsProvider,
    "openai": OpenAITTSProvider,
}

SYSTEM_KEY_MAP = {
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "gemini": "GEMINI_API_KEY",
    "dalle": "OPENAI_API_KEY",
    "stability": "STABILITY_API_KEY",
    "elevenlabs": "ELEVENLABS_API_KEY",
}


def _get_team_settings(db: Session, team_id) -> TeamSettings | None:
    result = db.execute(select(TeamSettings).where(TeamSettings.team_id == str(team_id)))
    return result.scalar_one_or_none()


def _resolve_key(ts: TeamSettings | None, provider_name: str, key_field: str) -> str:
    settings = get_settings()
    if ts:
        enc_key = getattr(ts, key_field, None)
        if enc_key:
            return decrypt_value(enc_key)

    system_key_attr = SYSTEM_KEY_MAP.get(provider_name, "")
    return getattr(settings, system_key_attr, "")


def get_llm_provider_for_team(db: Session, team_id) -> LLMProvider:
    ts = _get_team_settings(db, team_id)
    provider_name = (ts.llm_provider if ts and ts.llm_provider else "openai")
    api_key = _resolve_key(ts, provider_name, "llm_api_key_enc")
    provider_cls = LLM_PROVIDERS.get(provider_name, OpenAIProvider)
    return provider_cls(api_key=api_key)


def get_image_provider_for_team(db: Session, team_id) -> ImageProvider:
    ts = _get_team_settings(db, team_id)
    provider_name = (ts.image_provider if ts and ts.image_provider else "dalle")
    api_key = _resolve_key(ts, provider_name, "image_api_key_enc")
    provider_cls = IMAGE_PROVIDERS.get(provider_name, DalleProvider)
    return provider_cls(api_key=api_key)


def get_tts_provider_for_team(db: Session, team_id) -> TTSProvider:
    ts = _get_team_settings(db, team_id)
    provider_name = (ts.tts_provider if ts and ts.tts_provider else "elevenlabs")
    api_key = _resolve_key(ts, provider_name, "tts_api_key_enc")
    provider_cls = TTS_PROVIDERS.get(provider_name, ElevenLabsProvider)
    return provider_cls(api_key=api_key)
