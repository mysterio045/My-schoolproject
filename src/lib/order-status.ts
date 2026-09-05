/**
 * Order status helpers
 * ====================
 * Frontend mirror of the backend's order-lifecycle transition table
 * (`app/services/order_service.py::ORDER_TRANSITIONS`). The backend stays
 * authoritative — these helpers only drive UI affordances (next-step buttons,
 * whether Cancel is offered). Invalid transitions are rejected by the API and
 * surfaced via its error messages.
 */

import type { BackendOrderStatus } from "./types";

export const ORDER_LIFECYCLE: BackendOrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
];

export function getNextOrderStatus(
  status: BackendOrderStatus
): BackendOrderStatus | null {
  const index = ORDER_LIFECYCLE.indexOf(status);
  if (index === -1 || index === ORDER_LIFECYCLE.length - 1) return null;
  return ORDER_LIFECYCLE[index + 1];
}

export function canCancelOrder(status: BackendOrderStatus): boolean {
  return status === "pending" || status === "confirmed" || status === "preparing";
}

export const ORDER_ICON_LABELS: Record<BackendOrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};