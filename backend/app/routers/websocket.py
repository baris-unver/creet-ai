import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.utils.websocket_manager import manager

router = APIRouter()


@router.websocket("/projects/{project_id}")
async def project_ws(websocket: WebSocket, project_id: str):
    await manager.connect(project_id, websocket)
    try:
        listen_task = asyncio.create_task(manager.listen_redis(project_id, websocket))
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        listen_task.cancel()
        manager.disconnect(project_id, websocket)
