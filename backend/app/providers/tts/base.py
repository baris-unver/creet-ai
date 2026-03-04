from abc import ABC, abstractmethod


class TTSProvider(ABC):
    def __init__(self, api_key: str):
        self.api_key = api_key

    @abstractmethod
    def generate_sync(self, text: str, voice: str | None = None, **kwargs) -> bytes:
        """Generate speech audio synchronously, returns raw audio bytes (MP3)."""
        ...

    @abstractmethod
    async def generate(self, text: str, voice: str | None = None, **kwargs) -> bytes:
        """Generate speech audio asynchronously."""
        ...
