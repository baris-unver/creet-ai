import httpx

from app.providers.tts.base import TTSProvider

ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech"
DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Rachel


class ElevenLabsProvider(TTSProvider):
    def __init__(self, api_key: str):
        super().__init__(api_key)

    def _headers(self):
        return {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
        }

    def generate_sync(self, text: str, voice: str | None = None, **kwargs) -> bytes:
        voice_id = voice or DEFAULT_VOICE_ID
        url = f"{ELEVENLABS_API_URL}/{voice_id}"
        payload = {
            "text": text,
            "model_id": kwargs.get("model_id", "eleven_multilingual_v2"),
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
            },
        }
        with httpx.Client(timeout=60) as client:
            response = client.post(url, json=payload, headers=self._headers())
            response.raise_for_status()
            return response.content

    async def generate(self, text: str, voice: str | None = None, **kwargs) -> bytes:
        voice_id = voice or DEFAULT_VOICE_ID
        url = f"{ELEVENLABS_API_URL}/{voice_id}"
        payload = {
            "text": text,
            "model_id": kwargs.get("model_id", "eleven_multilingual_v2"),
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
            },
        }
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(url, json=payload, headers=self._headers())
            response.raise_for_status()
            return response.content
