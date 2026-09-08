/**
 * Dispatch API
 * ============
 * Typed functions for the Phase 4D smart dispatch endpoints, using the
 * centralized API client so the auth token is attached automatically.
 *
 * The backend picks the nearest eligible available rider live (Haversine over
 * the riders' current coordinates) and commits the assignment atomically.
 *
 * Endpoints consumed:
 *   POST /api/dispatch/nearest-rider — assign nearest available rider (auth)
 *   POST /api/dispatch/assign        — explicit alias of nearest-rider (auth)
 */

import { apiClient } from "@/lib/api/client";
import type { DispatchRequestPayload, DispatchResult } from "@/lib/types";

/** Assign the nearest eligible available rider to a ready order. */
export async function assignNearestRider(
  orderId: string
): Promise<DispatchResult> {
  const payload: DispatchRequestPayload = { order_id: orderId };
  return apiClient.post<DispatchResult>(
    "/api/dispatch/nearest-rider",
    payload
  );
}

/** Explicit alias for `/api/dispatch/nearest-rider` (same backend service). */
export async function assignRider(orderId: string): Promise<DispatchResult> {
  const payload: DispatchRequestPayload = { order_id: orderId };
  return apiClient.post<DispatchResult>("/api/dispatch/assign", payload);
}