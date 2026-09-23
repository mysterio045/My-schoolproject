"""
Realtime WebSocket Endpoint
===========================
Authenticated WebSocket channel for lightweight invalidation events.

Conventions
-----------
- The client opens ``/ws`` and MUST send the first frame within the auth
  window::

      {"type": "auth", "token": "<JWT>"}

  On success the server replies ``{"type": "auth_ok"}`` and the connection
  becomes a subscriber for realtime events.
- The token is NEVER placed in the URL query string (so it cannot leak via
  browser history, proxies, or server access logs).
- On any auth failure the server sends ``{"type": "error", "message": ...}``
  and closes the socket with code 1008 (policy violation). Unauthenticated
  sockets are closed.
- The client may send ``{"type": "ping"}`` and the server replies
  ``{"type": "pong"}`` to keep the connection alive / measure latency.
- Origin restriction mirrors the REST CORS configuration. Browsers always
  send an Origin header, so mismatched origins are rejected before the
  handshake is accepted. Non-browser clients (no Origin header) are allowed.
"""

from __future__ import annotations

import asyncio
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.config import settings
from app.database import async_session_factory
from app.models.admin import AdminUser
from app.realtime import manager
from app.services.security import decode_access_token

from jose import JWTError

router = APIRouter()

AUTH_TIMEOUT_SECONDS = 10
CLOSE_POLICY_VIOLATION = 1008


async def _resolve_admin_user(token: str) -> AdminUser | None:
    """Validate a JWT and resolve it to an active admin, or return None."""
    try:
        payload = decode_access_token(token)
    except JWTError:
        return None

    subject = payload.get("sub")
    if not subject:
        return None
    try:
        admin_id = uuid.UUID(str(subject))
    except (ValueError, TypeError):
        return None

    async with async_session_factory() as db:
        admin = await db.get(AdminUser, admin_id)
        if admin is None or not admin.is_active:
            return None
        return admin


async def _reject(websocket: WebSocket, message: str) -> None:
    """Send an error frame then politely close the socket."""
    try:
        await websocket.send_json({"type": "error", "message": message})
    except Exception:
        pass
    try:
        await websocket.close(code=CLOSE_POLICY_VIOLATION)
    except Exception:
        pass


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    # ------------------------------------------------------------------
    # Origin restriction (consistent with CORS). Browsers always send an
    # Origin header, so a mismatched origin is rejected before accept.
    # ------------------------------------------------------------------
    origin = websocket.headers.get("origin")
    if origin and origin not in settings.cors_origins_list:
        await WebSocketRejection.close(websocket)
        return

    await manager.connect(websocket)
    try:
        # ------------------------------------------------------------------
        # Authentication handshake (within the auth window).
        # ------------------------------------------------------------------
        try:
            message = await asyncio.wait_for(
                websocket.receive_json(), timeout=AUTH_TIMEOUT_SECONDS
            )
        except asyncio.TimeoutError:
            await _reject(websocket, "Authentication timeout")
            return
        except (WebSocketDisconnect, ValueError):
            await _reject(websocket, "Authentication required")
            return

        if not isinstance(message, dict) or message.get("type") != "auth":
            await _reject(websocket, "Authentication required")
            return

        token = message.get("token")
        if not token or not isinstance(token, str):
            await _reject(websocket, "Authentication required")
            return

        admin = await _resolve_admin_user(token)
        if admin is None:
            await _reject(websocket, "Invalid or expired token")
            return

        await websocket.send_json(
            {"type": "auth_ok", "admin_id": str(admin.id)}
        )

        # ------------------------------------------------------------------
        # Subscribed: relay messages / keep-alive until the client leaves.
        # ------------------------------------------------------------------
        while True:
            data = await websocket.receive_json()
            if isinstance(data, dict) and data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            # All other incoming frames are ignored; the channel is
            # server→client push only.

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await manager.disconnect(websocket)


class WebSocketRejection:
    """Small helper to reject a non-allowed origin before accepting."""

    @staticmethod
    async def close(websocket: WebSocket) -> None:
        try:
            await websocket.close(code=CLOSE_POLICY_VIOLATION)
        except Exception:
            pass