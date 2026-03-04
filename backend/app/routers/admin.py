import httpx
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


TEST_ENDPOINTS = {
    "openai_api_key": {
        "url": "https://api.openai.com/v1/models",
        "method": "GET",
        "auth_header": "Bearer",
    },
    "anthropic_api_key": {
        "url": "https://api.anthropic.com/v1/messages",
        "method": "POST",
        "auth_header": "x-api-key",
        "body": {"model": "claude-3-haiku-20240307", "max_tokens": 1, "messages": [{"role": "user", "content": "hi"}]},
        "extra_headers": {"anthropic-version": "2023-06-01"},
    },
    "gemini_api_key": {
        "url": "https://generativelanguage.googleapis.com/v1beta/models?key={key}",
        "method": "GET",
        "auth_header": None,
    },
    "stability_api_key": {
        "url": "https://api.stability.ai/v1/user/account",
        "method": "GET",
        "auth_header": "Bearer",
    },
    "elevenlabs_api_key": {
        "url": "https://api.elevenlabs.io/v1/user",
        "method": "GET",
        "auth_header": "xi-api-key",
    },
    "resend_api_key": {
        "url": "https://api.resend.com/api-keys",
        "method": "GET",
        "auth_header": "Bearer",
    },
}


class TestKeyRequest(BaseModel):
    key_name: str


class TestKeyResponse(BaseModel):
    key_name: str
    success: bool
    message: str


@router.post("/settings/keys/test", response_model=TestKeyResponse)
async def test_system_key(body: TestKeyRequest, db: DB, admin: SuperAdmin):
    if body.key_name not in TEST_ENDPOINTS:
        return TestKeyResponse(key_name=body.key_name, success=False, message="No test available for this key.")

    result = await db.execute(select(SystemSetting).where(SystemSetting.key == body.key_name))
    setting = result.scalar_one_or_none()
    if not setting or not setting.value_enc:
        return TestKeyResponse(key_name=body.key_name, success=False, message="Key not configured.")

    api_key = decrypt_value(setting.value_enc)
    config = TEST_ENDPOINTS[body.key_name]

    try:
        url = config["url"].replace("{key}", api_key) if "{key}" in config["url"] else config["url"]
        headers: dict[str, str] = {}
        if config["auth_header"] == "Bearer":
            headers["Authorization"] = f"Bearer {api_key}"
        elif config["auth_header"] == "x-api-key":
            headers["x-api-key"] = api_key
        elif config["auth_header"] == "xi-api-key":
            headers["xi-api-key"] = api_key
        if config.get("extra_headers"):
            headers.update(config["extra_headers"])

        async with httpx.AsyncClient(timeout=15) as client:
            if config["method"] == "GET":
                resp = await client.get(url, headers=headers)
            else:
                headers["Content-Type"] = "application/json"
                resp = await client.post(url, json=config.get("body", {}), headers=headers)

        if resp.status_code < 400:
            return TestKeyResponse(key_name=body.key_name, success=True, message=f"Connected successfully (HTTP {resp.status_code}).")
        else:
            detail = ""
            try:
                err = resp.json()
                detail = err.get("error", {}).get("message", "") or err.get("message", "") or str(err)[:200]
            except Exception:
                detail = resp.text[:200]
            return TestKeyResponse(key_name=body.key_name, success=False, message=f"HTTP {resp.status_code}: {detail}")

    except httpx.TimeoutException:
        return TestKeyResponse(key_name=body.key_name, success=False, message="Connection timed out.")
    except Exception as e:
        return TestKeyResponse(key_name=body.key_name, success=False, message=f"Error: {str(e)[:200]}")
