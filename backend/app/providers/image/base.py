from abc import ABC, abstractmethod


class ImageProvider(ABC):
    def __init__(self, api_key: str):
        self.api_key = api_key

    @abstractmethod
    def generate_sync(self, prompt: str, width: int, height: int, **kwargs) -> bytes:
        """Generate an image synchronously, returns raw image bytes."""
        ...

    @abstractmethod
    async def generate(self, prompt: str, width: int, height: int, **kwargs) -> bytes:
        """Generate an image asynchronously."""
        ...
