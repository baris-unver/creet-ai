import httpx

from app.providers.image.base import ImageProvider

STABILITY_API_URL = "https://api.stability.ai/v2beta/stable-image/generate/sd3"


class StabilityProvider(ImageProvider):
    def __init__(self, api_key: str):
        super().__init__(api_key)

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "image/*",
        }

    def _aspect_ratio(self, width: int, height: int) -> str:
        ratio = width / height
        if ratio > 1.5:
            return "16:9"
        elif ratio < 0.7:
            return "9:16"
        elif 0.9 < ratio < 1.1:
            return "1:1"
        elif ratio > 1.0:
            return "4:3"
        else:
            return "3:4"

    def generate_sync(self, prompt: str, width: int, height: int, **kwargs) -> bytes:
        aspect = self._aspect_ratio(width, height)
        with httpx.Client(timeout=120) as client:
            response = client.post(
                STABILITY_API_URL,
                headers=self._headers(),
                files={"none": ""},
                data={
                    "prompt": prompt,
                    "aspect_ratio": aspect,
                    "output_format": "png",
                },
            )
            response.raise_for_status()
            return response.content

    async def generate(self, prompt: str, width: int, height: int, **kwargs) -> bytes:
        aspect = self._aspect_ratio(width, height)
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                STABILITY_API_URL,
                headers=self._headers(),
                files={"none": ""},
                data={
                    "prompt": prompt,
                    "aspect_ratio": aspect,
                    "output_format": "png",
                },
            )
            response.raise_for_status()
            return response.content
