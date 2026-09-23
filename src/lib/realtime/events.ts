/**
 * Realtime event contract (mirrors the backend realtime event types).
 *
 * Event payloads are lightweight INVALIDATION SIGNALS. After receiving one,
 * pages refetch the authoritative state from the REST API — the socket never
 * carries application objects.
 */

export const REALTIME_EVENTS = {
  ORDER_CREATED: "order.created",
  ORDER_UPDATED: "order.updated",
  DELIVERY_UPDATED: "delivery.updated",
  DISPATCH_ASSIGNED: "dispatch.assigned",
  RIDER_UPDATED: "rider.updated",
  NOTIFICATION_CREATED: "notification.created",
  NOTIFICATION_READ: "notification.read",
  /** Server-side pseudo event: the socket (re)authenticated successfully. */
  CONNECTED: "realtime.connected",
} as const;

export interface RealtimeEvent {
  type: string;
  entity_id?: string;
  timestamp?: string;
  order_id?: string;
  delivery_id?: string;
  rider_id?: string;
  recipient_type?: string;
  recipient_id?: string;
  [key: string]: unknown;
}