import httpx

from app.providers.tts.base import TTSProvider

OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech"


class OpenAITTSProvider(TTSProvider):
    def __init__(self, api_key: str):
        super().__init__(api_key)

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def generate_sync(self, text: str, voice: str | None = None, **kwargs) -> bytes:
        payload = {
            "model": kwargs.get("model", "tts-1"),
            "input": text,
            "voice": voice or "alloy",
            "response_format": "mp3",
        }
        with httpx.Client(timeout=60) as client:
            response = client.post(OPENAI_TTS_URL, json=payload, headers=self._headers())
            response.raise_for_status()
            return response.content

    async def generate(self, text: str, voice: str | None = None, **kwargs) -> bytes:
        payload = {
            "model": kwargs.get("model", "tts-1"),
            "input": text,
            "voice": voice or "alloy",
            "response_format": "mp3",
        }
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(OPENAI_TTS_URL, json=payload, headers=self._headers())
            response.raise_for_status()
            return response.content
