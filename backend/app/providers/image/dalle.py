import base64

import httpx

from app.providers.image.base import ImageProvider

OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations"

DALLE_SIZE_MAP = {
    (1920, 1080): "1792x1024",
    (1080, 1920): "1024x1792",
    (1080, 1080): "1024x1024",
}


class DalleProvider(ImageProvider):
    def __init__(self, api_key: str, model: str = "dall-e-3"):
        super().__init__(api_key)
        self.model = model

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _closest_size(self, width: int, height: int) -> str:
        ratio = width / height
        if ratio > 1.2:
            return "1792x1024"
        elif ratio < 0.8:
            return "1024x1792"
        return "1024x1024"

    def generate_sync(self, prompt: str, width: int, height: int, **kwargs) -> bytes:
        size = self._closest_size(width, height)
        payload = {
            "model": self.model,
            "prompt": prompt,
            "n": 1,
            "size": size,
            "quality": kwargs.get("quality", "standard"),
            "response_format": "b64_json",
        }
        with httpx.Client(timeout=120) as client:
            response = client.post(OPENAI_IMAGES_URL, json=payload, headers=self._headers())
            response.raise_for_status()
            data = response.json()
            return base64.b64decode(data["data"][0]["b64_json"])

    async def generate(self, prompt: str, width: int, height: int, **kwargs) -> bytes:
        size = self._closest_size(width, height)
        payload = {
            "model": self.model,
            "prompt": prompt,
            "n": 1,
            "size": size,
            "quality": kwargs.get("quality", "standard"),
            "response_format": "b64_json",
        }
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(OPENAI_IMAGES_URL, json=payload, headers=self._headers())
            response.raise_for_status()
            data = response.json()
            return base64.b64decode(data["data"][0]["b64_json"])
