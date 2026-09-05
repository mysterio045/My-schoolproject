/**
 * Orders API
 * ==========
 * Typed functions for the Phase 4B order endpoints, using the centralized API
 * client so the auth token is attached automatically.
 *
 * Endpoints consumed:
 *   GET   /api/orders                     — list orders (paged)
 *   GET   /api/orders/{order_id}          — order detail
 *   PATCH /api/orders/{order_id}/status   — advance order status
 *   GET   /api/deliveries/order/{order_id} — delivery for an order
 *   GET   /api/riders/{rider_id}          — rider detail (assigned rider info)
 */

import { apiClient } from "@/lib/api/client";
import type {
  BackendOrderStatus,
  DeliveryRecord,
  OrderRecord,
  PageResult,
  RiderRecord,
} from "@/lib/types";

export interface OrderListParams {
  page?: number;
  page_size?: number;
  customer_id?: string;
}

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

/** List orders (newest first) with pagination and optional customer filter. */
export async function getOrders(
  params: OrderListParams = {}
): Promise<PageResult<OrderRecord>> {
  return apiClient.get<PageResult<OrderRecord>>(
    `/api/orders${toQuery(params)}`
  );
}

/** Get one order with its items, timeline, and delivery. */
export async function getOrder(orderId: string): Promise<OrderRecord> {
  return apiClient.get<OrderRecord>(`/api/orders/${orderId}`);
}

/** Advance an order's status. The backend validates the transition. */
export async function updateOrderStatus(
  orderId: string,
  status: BackendOrderStatus
): Promise<OrderRecord> {
  return apiClient.patch<OrderRecord>(`/api/orders/${orderId}/status`, {
    status,
  });
}

/** Get the delivery record linked to an order. */
export async function getDeliveryByOrder(
  orderId: string
): Promise<DeliveryRecord> {
  return apiClient.get<DeliveryRecord>(
    `/api/deliveries/order/${orderId}`
  );
}

/** Get a rider with delivery history. */
export async function getRider(riderId: string): Promise<RiderRecord> {
  return apiClient.get<RiderRecord>(`/api/riders/${riderId}`);
}