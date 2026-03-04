from abc import ABC, abstractmethod


class LLMProvider(ABC):
    def __init__(self, api_key: str):
        self.api_key = api_key

    @abstractmethod
    def generate_sync(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        """Synchronous generation for use in Celery tasks."""
        ...

    @abstractmethod
    async def generate(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        """Async generation for use in FastAPI routes."""
        ...

    @abstractmethod
    def generate_structured_sync(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        """Synchronous structured output that returns valid JSON."""
        ...
