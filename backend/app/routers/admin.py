from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import select

from app.dependencies import DB, SuperAdmin
from app.models.user import SystemSetting
from app.utils.encryption import encrypt_value, decrypt_value

router = APIRouter()

SYSTEM_KEYS = [
    {"key": "openai_api_key", "label": "OpenAI API Key", "description": "Used for GPT-4o LLM and DALL-E 3 image generation"},
    {"key": "anthropic_api_key", "label": "Anthropic API Key", "description": "Used for Claude LLM"},
    {"key": "gemini_api_key", "label": "Google Gemini API Key", "description": "Used for Gemini LLM"},
    {"key": "stability_api_key", "label": "Stability AI API Key", "description": "Used for Stable Diffusion image generation"},
    {"key": "elevenlabs_api_key", "label": "ElevenLabs API Key", "description": "Used for TTS voiceover generation"},
    {"key": "resend_api_key", "label": "Resend API Key", "description": "Used for sending invitation emails"},
    {"key": "google_client_id", "label": "Google OAuth Client ID", "description": "Used for Google login"},
    {"key": "google_client_secret", "label": "Google OAuth Client Secret", "description": "Used for Google login"},
]


class SystemKeyStatus(BaseModel):
    key: str
    label: str
    description: str
    is_set: bool


class SystemKeysResponse(BaseModel):
    keys: list[SystemKeyStatus]


class SystemKeyUpdate(BaseModel):
    key: str
    value: str


class SystemKeysUpdateRequest(BaseModel):
    keys: list[SystemKeyUpdate]


@router.get("/settings/keys", response_model=SystemKeysResponse)
async def get_system_keys(db: DB, admin: SuperAdmin):
    result = await db.execute(select(SystemSetting))
    existing = {s.key: s for s in result.scalars().all()}

    keys = []
    for entry in SYSTEM_KEYS:
        setting = existing.get(entry["key"])
        keys.append(SystemKeyStatus(
            key=entry["key"],
            label=entry["label"],
            description=entry["description"],
            is_set=setting is not None and setting.value_enc is not None,
        ))
    return SystemKeysResponse(keys=keys)


@router.put("/settings/keys", response_model=SystemKeysResponse)
async def update_system_keys(body: SystemKeysUpdateRequest, db: DB, admin: SuperAdmin):
    valid_keys = {e["key"] for e in SYSTEM_KEYS}

    for item in body.keys:
        if item.key not in valid_keys:
            continue
        if not item.value.strip():
            continue

        result = await db.execute(select(SystemSetting).where(SystemSetting.key == item.key))
        setting = result.scalar_one_or_none()

        if setting:
            setting.value_enc = encrypt_value(item.value.strip())
        else:
            meta = next(e for e in SYSTEM_KEYS if e["key"] == item.key)
            setting = SystemSetting(
                key=item.key,
                value_enc=encrypt_value(item.value.strip()),
                description=meta["description"],
            )
            db.add(setting)

    await db.commit()

    result = await db.execute(select(SystemSetting))
    existing = {s.key: s for s in result.scalars().all()}

    keys = []
    for entry in SYSTEM_KEYS:
        setting = existing.get(entry["key"])
        keys.append(SystemKeyStatus(
            key=entry["key"],
            label=entry["label"],
            description=entry["description"],
            is_set=setting is not None and setting.value_enc is not None,
        ))
    return SystemKeysResponse(keys=keys)


@router.delete("/settings/keys/{key_name}")
async def delete_system_key(key_name: str, db: DB, admin: SuperAdmin):
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key_name))
    setting = result.scalar_one_or_none()
    if setting:
        await db.delete(setting)
        await db.commit()
    return {"status": "ok"}
