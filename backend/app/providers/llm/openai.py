import httpx

from app.providers.llm.base import LLMProvider

OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "gpt-4o"):
        super().__init__(api_key)
        self.model = model

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _build_payload(self, system_prompt: str, user_prompt: str, **kwargs):
        return {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 4096),
        }

    def generate_sync(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        payload = self._build_payload(system_prompt, user_prompt, **kwargs)
        with httpx.Client(timeout=120) as client:
            response = client.post(OPENAI_CHAT_URL, json=payload, headers=self._headers())
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def generate(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        payload = self._build_payload(system_prompt, user_prompt, **kwargs)
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(OPENAI_CHAT_URL, json=payload, headers=self._headers())
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    def generate_structured_sync(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        payload = self._build_payload(system_prompt, user_prompt, **kwargs)
        payload["response_format"] = {"type": "json_object"}
        with httpx.Client(timeout=120) as client:
            response = client.post(OPENAI_CHAT_URL, json=payload, headers=self._headers())
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
