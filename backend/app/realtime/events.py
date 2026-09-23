"""
Realtime Event Contract
=======================
Typed change events broadcast over the authenticated WebSocket channel.

Events are lightweight INVALIDATION SIGNALS: after receiving one, clients
refetch the authoritative state from the REST API. No large application
objects are ever sent through the socket.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

# Supported event types (keep this list deliberately small).
ORDER_CREATED = "order.created"
ORDER_UPDATED = "order.updated"
DELIVERY_UPDATED = "delivery.updated"
DISPATCH_ASSIGNED = "dispatch.assigned"
RIDER_UPDATED = "rider.updated"
NOTIFICATION_CREATED = "notification.created"
NOTIFICATION_READ = "notification.read"

# Pseudo-event delivered to connected clients as soon as a socket is
# (re)authenticated so pages can refetch authoritative state after a
# disconnect and thereby avoid missing any events that happened meanwhile.
REALTIME_CONNECTED = "realtime.connected"


def make_event(
    event_type: str,
    entity_id: str | uuid.UUID | None = None,
    **extra: Any,
) -> dict[str, Any]:
    """Build a well-formed realtime event payload."""
    event: dict[str, Any] = {
        "type": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if entity_id is not None:
        event["entity_id"] = str(entity_id)
    event.update(extra)
    return event