/**
 * Deliveries API
 * ==============
 * Typed functions for the delivery endpoints, using the centralized API client
 * so the auth token is attached automatically.
 *
 * A delivery is the logistics half of an order (1:1). Its status tracks the
 * lifecycle `pending → assigned → accepted → picked_up → on_the_way →
 * delivered / failed`, independently of the order's kitchen status.
 *
 * Endpoints consumed:
 *   GET /api/deliveries                 — list deliveries (status filter, auth)
 *   GET /api/deliveries/{id}            — one delivery incl. nested order (auth)
 *   GET /api/deliveries/order/{order_id} — delivery for an order (auth)
 */

import { apiClient } from "@/lib/api/client";
import type { DeliveryListParams, DeliveryRecord, PageResult } from "@/lib/types";

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

/** List deliveries (newest first) with optional status filter + pagination. */
export async function getDeliveries(
  params: DeliveryListParams = {}
): Promise<PageResult<DeliveryRecord>> {
  return apiClient.get<PageResult<DeliveryRecord>>(
    `/api/deliveries${toQuery(params)}`
  );
}

/** Get one delivery including its nested order. */
export async function getDelivery(deliveryId: string): Promise<DeliveryRecord> {
  return apiClient.get<DeliveryRecord>(`/api/deliveries/${deliveryId}`);
}

/** Get the delivery record linked to an order. */
export async function getDeliveryByOrder(
  orderId: string
): Promise<DeliveryRecord> {
  return apiClient.get<DeliveryRecord>(`/api/deliveries/order/${orderId}`);
}