import httpx

from app.providers.llm.base import LLMProvider

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"


class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        super().__init__(api_key)
        self.model = model

    def _headers(self):
        return {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }

    def _build_payload(self, system_prompt: str, user_prompt: str, **kwargs):
        return {
            "model": self.model,
            "max_tokens": kwargs.get("max_tokens", 4096),
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
        }

    def generate_sync(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        payload = self._build_payload(system_prompt, user_prompt, **kwargs)
        with httpx.Client(timeout=120) as client:
            response = client.post(ANTHROPIC_API_URL, json=payload, headers=self._headers())
            response.raise_for_status()
            data = response.json()
            return data["content"][0]["text"]

    async def generate(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        payload = self._build_payload(system_prompt, user_prompt, **kwargs)
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(ANTHROPIC_API_URL, json=payload, headers=self._headers())
            response.raise_for_status()
            data = response.json()
            return data["content"][0]["text"]

    def generate_structured_sync(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        enhanced_prompt = user_prompt + "\n\nIMPORTANT: Respond with valid JSON only, no other text."
        return self.generate_sync(system_prompt, enhanced_prompt, **kwargs)
