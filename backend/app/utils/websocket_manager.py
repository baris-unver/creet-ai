import json
from collections import defaultdict

import redis.asyncio as aioredis
from fastapi import WebSocket

from app.config import get_settings


class ConnectionManager:
    def __init__(self):
        self._connections: dict[str, list[WebSocket]] = defaultdict(list)
        self._redis = None

    def _get_redis(self):
        if self._redis is None:
            settings = get_settings()
            self._redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        return self._redis

    async def connect(self, project_id: str, websocket: WebSocket):
        await websocket.accept()
        self._connections[project_id].append(websocket)

    def disconnect(self, project_id: str, websocket: WebSocket):
        self._connections[project_id].remove(websocket)
        if not self._connections[project_id]:
            del self._connections[project_id]

    async def broadcast(self, project_id: str, message: dict):
        for ws in self._connections.get(project_id, []):
            try:
                await ws.send_json(message)
            except Exception:
                pass

    async def listen_redis(self, project_id: str, websocket: WebSocket):
        r = self._get_redis()
        pubsub = r.pubsub()
        channel = f"project:{project_id}"
        await pubsub.subscribe(channel)
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    await websocket.send_json(data)
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()


manager = ConnectionManager()
