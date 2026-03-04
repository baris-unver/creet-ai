import httpx
import traceback
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


class DiagnosticStep(BaseModel):
    step: str
    success: bool
    message: str
    detail: str | None = None


class PipelineDiagnosticResponse(BaseModel):
    overall_success: bool
    steps: list[DiagnosticStep]


@router.post("/pipeline/test", response_model=PipelineDiagnosticResponse)
async def test_pipeline(db: DB, admin: SuperAdmin):
    steps: list[DiagnosticStep] = []

    # Step 1: Check if openai_api_key exists in system_settings
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == "openai_api_key"))
    setting = result.scalar_one_or_none()
    if not setting or not setting.value_enc:
        steps.append(DiagnosticStep(
            step="Read OpenAI key from DB",
            success=False,
            message="No openai_api_key found in system_settings table.",
        ))
        return PipelineDiagnosticResponse(overall_success=False, steps=steps)

    steps.append(DiagnosticStep(
        step="Read OpenAI key from DB",
        success=True,
        message="Key found in system_settings.",
    ))

    # Step 2: Decrypt the key
    try:
        api_key = decrypt_value(setting.value_enc)
        masked = f"{api_key[:8]}...{api_key[-4:]}" if len(api_key) > 12 else "***"
        steps.append(DiagnosticStep(
            step="Decrypt API key",
            success=True,
            message=f"Decrypted successfully. Key preview: {masked}",
        ))
    except Exception as e:
        steps.append(DiagnosticStep(
            step="Decrypt API key",
            success=False,
            message=f"Decryption failed: {str(e)[:200]}",
        ))
        return PipelineDiagnosticResponse(overall_success=False, steps=steps)

    # Step 3: Test OpenAI models endpoint (lightweight)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
            )
        if resp.status_code == 200:
            steps.append(DiagnosticStep(
                step="OpenAI API auth (GET /v1/models)",
                success=True,
                message=f"HTTP {resp.status_code} — API key is valid.",
            ))
        else:
            detail = ""
            try:
                err = resp.json()
                detail = err.get("error", {}).get("message", resp.text[:200])
            except Exception:
                detail = resp.text[:200]
            steps.append(DiagnosticStep(
                step="OpenAI API auth (GET /v1/models)",
                success=False,
                message=f"HTTP {resp.status_code} — key rejected.",
                detail=detail,
            ))
            return PipelineDiagnosticResponse(overall_success=False, steps=steps)
    except Exception as e:
        steps.append(DiagnosticStep(
            step="OpenAI API auth (GET /v1/models)",
            success=False,
            message=f"Connection error: {str(e)[:200]}",
        ))
        return PipelineDiagnosticResponse(overall_success=False, steps=steps)

    # Step 4: Test a real chat completion (tiny request)
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o",
                    "messages": [
                        {"role": "system", "content": "Reply with exactly: OK"},
                        {"role": "user", "content": "Test"},
                    ],
                    "max_tokens": 5,
                },
            )
        if resp.status_code == 200:
            data = resp.json()
            reply = data["choices"][0]["message"]["content"]
            steps.append(DiagnosticStep(
                step="OpenAI chat completion (GPT-4o)",
                success=True,
                message=f"Got response: \"{reply}\"",
            ))
        else:
            detail = ""
            try:
                err = resp.json()
                detail = err.get("error", {}).get("message", resp.text[:300])
            except Exception:
                detail = resp.text[:300]
            steps.append(DiagnosticStep(
                step="OpenAI chat completion (GPT-4o)",
                success=False,
                message=f"HTTP {resp.status_code}",
                detail=detail,
            ))
            return PipelineDiagnosticResponse(overall_success=False, steps=steps)
    except Exception as e:
        steps.append(DiagnosticStep(
            step="OpenAI chat completion (GPT-4o)",
            success=False,
            message=f"Error: {str(e)[:200]}",
        ))
        return PipelineDiagnosticResponse(overall_success=False, steps=steps)

    # Step 5: Test provider registry resolution (sync, simulating celery)
    try:
        from app.database import SyncSessionLocal
        from app.providers.registry import get_llm_provider_for_team

        sync_db = SyncSessionLocal()
        try:
            # Use a dummy team_id — the registry will fall back to system key
            import uuid
            provider = get_llm_provider_for_team(sync_db, uuid.uuid4())
            key_preview = f"{provider.api_key[:8]}...{provider.api_key[-4:]}" if len(provider.api_key) > 12 else "***"
            steps.append(DiagnosticStep(
                step="Provider registry (sync DB)",
                success=True,
                message=f"Resolved provider: {type(provider).__name__}, key: {key_preview}",
            ))
        finally:
            sync_db.close()
    except Exception as e:
        steps.append(DiagnosticStep(
            step="Provider registry (sync DB)",
            success=False,
            message=f"Failed: {str(e)[:200]}",
            detail=traceback.format_exc()[-500:],
        ))
        return PipelineDiagnosticResponse(overall_success=False, steps=steps)

    # Step 6: Test outline generation with dummy brief (via provider)
    try:
        from app.database import SyncSessionLocal
        from app.providers.registry import get_llm_provider_for_team

        sync_db = SyncSessionLocal()
        try:
            import uuid
            provider = get_llm_provider_for_team(sync_db, uuid.uuid4())
            result = provider.generate_sync(
                "You are a video production assistant. Reply with a short 2-line outline.",
                "Create a 30-second video about a cat playing piano.",
                max_tokens=100,
            )
            steps.append(DiagnosticStep(
                step="Dummy outline generation",
                success=True,
                message=f"Generated {len(result)} chars.",
                detail=result[:300],
            ))
        finally:
            sync_db.close()
    except Exception as e:
        steps.append(DiagnosticStep(
            step="Dummy outline generation",
            success=False,
            message=f"Failed: {str(e)[:200]}",
            detail=traceback.format_exc()[-500:],
        ))
        return PipelineDiagnosticResponse(overall_success=False, steps=steps)

    return PipelineDiagnosticResponse(overall_success=True, steps=steps)
