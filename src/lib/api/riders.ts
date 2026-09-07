/**
 * Riders API
 * ==========
 * Typed functions for the Phase 4C rider endpoints, using the centralized
 * API client so the auth token is attached automatically.
 *
 * Endpoints consumed:
 *   GET   /api/riders            — list riders (search + status filter + pagination, auth)
 *   GET   /api/riders/{id}      — one rider incl. location + delivery history (auth)
 *   POST  /api/riders           — create a rider (auth)
 *   PATCH /api/riders/{id}      — update a rider (auth)
 *   PATCH /api/riders/{id}/status — update a rider's status (auth)
 */

import { apiClient } from "@/lib/api/client";
import type {
  PageResult,
  RiderCreatePayload,
  RiderListParams,
  RiderRecord,
  RiderStatus,
  RiderUpdatePayload,
} from "@/lib/types";

function toQuery(params: object): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (
      value !== undefined &&
      (typeof value === "string" || typeof value === "number")
    ) {
      query.set(key, String(value));
    }
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

/** List riders with optional search, status filter + pagination. */
export async function getRiders(
  params: RiderListParams = {}
): Promise<PageResult<RiderRecord>> {
  return apiClient.get<PageResult<RiderRecord>>(
    `/api/riders${toQuery(params)}`
  );
}

/** Get one rider including their live location and delivery history. */
export async function getRider(riderId: string): Promise<RiderRecord> {
  return apiClient.get<RiderRecord>(`/api/riders/${riderId}`);
}

/** Create a new rider. */
export async function createRider(
  payload: RiderCreatePayload
): Promise<RiderRecord> {
  return apiClient.post<RiderRecord>("/api/riders", payload);
}

/** Update a rider's mutable fields (email/status/nullable fields respected). */
export async function updateRider(
  riderId: string,
  payload: RiderUpdatePayload
): Promise<RiderRecord> {
  return apiClient.patch<RiderRecord>(`/api/riders/${riderId}`, payload);
}

/** Update only a rider's status: `available`, `busy`, or `offline`. */
export async function updateRiderStatus(
  riderId: string,
  status: RiderStatus
): Promise<RiderRecord> {
  return apiClient.patch<RiderRecord>(`/api/riders/${riderId}/status`, {
    status,
  });
}