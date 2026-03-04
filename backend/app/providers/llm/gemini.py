import httpx

from app.providers.llm.base import LLMProvider

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "gemini-2.0-flash"):
        super().__init__(api_key)
        self.model = model

    def _url(self):
        return f"{GEMINI_API_URL}/{self.model}:generateContent?key={self.api_key}"

    def _build_payload(self, system_prompt: str, user_prompt: str, **kwargs):
        return {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"parts": [{"text": user_prompt}]}],
            "generationConfig": {
                "temperature": kwargs.get("temperature", 0.7),
                "maxOutputTokens": kwargs.get("max_tokens", 4096),
            },
        }

    def generate_sync(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        payload = self._build_payload(system_prompt, user_prompt, **kwargs)
        with httpx.Client(timeout=120) as client:
            response = client.post(self._url(), json=payload)
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

    async def generate(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        payload = self._build_payload(system_prompt, user_prompt, **kwargs)
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(self._url(), json=payload)
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

    def generate_structured_sync(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        payload = self._build_payload(system_prompt, user_prompt, **kwargs)
        payload["generationConfig"]["responseMimeType"] = "application/json"
        with httpx.Client(timeout=120) as client:
            response = client.post(self._url(), json=payload)
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
