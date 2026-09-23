"""
Realtime backend package.

Provides the in-memory connection manager and the ``publish`` helper used by
domain services to broadcast lightweight invalidation events. Importing this
package must not pull in any service module (avoids circular imports).
"""

from __future__ import annotations

from .events import make_event
from .manager import ConnectionManager

manager = ConnectionManager()


async def publish(event_type: str, entity_id=None, **extra):
    """Broadcast one event payload to all authenticated sockets."""
    payload = make_event(event_type, entity_id=entity_id, **extra)
    await manager.broadcast(payload)
    return payload