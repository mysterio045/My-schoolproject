"""
Realtime Connection Manager
===========================
In-memory registry of authenticated WebSocket connections.

Limitation: this manager lives entirely in the memory of a single API
process. If multiple uvicorn workers (or multiple servers) are deployed,
events published from one process are not visible to sockets connected to
another. This is an intentional MVP trade-off -- the project does not use
Redis, Kafka or any external provider. For single-instance deployments the
broadcast is correct and immediate.
"""

from __future__ import annotations

from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: list[WebSocket] = []
        self._ids: set[int] = set()

    @property
    def connection_count(self) -> int:
        return len(self._connections)

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.append(websocket)
        self._ids.add(id(websocket))

    async def disconnect(self, websocket: WebSocket) -> None:
        self._connections = [ws for ws in self._connections if id(ws) != id(websocket)]
        self._ids.discard(id(websocket))

    @property
    def is_connected(self, websocket: WebSocket) -> bool:
        return id(websocket) in self._ids

    async def send_json(self, websocket: WebSocket, payload: dict[str, Any]) -> bool:
        """Send one payload to one socket; never raises."""
        try:
            await websocket.send_json(payload)
            return True
        except Exception:
            # Socket is gone or broken; drop it silently.
            await self.disconnect(websocket)
            return False

    async def broadcast(self, payload: dict[str, Any]) -> None:
        """Send a payload to every authenticated connection; never raises."""
        for websocket in list(self._connections):
            await self.send_json(websocket, payload)