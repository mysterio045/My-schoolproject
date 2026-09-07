/**
 * Customers API
 * =============
 * Typed functions for the Phase 4A customer endpoints, using the centralized
 * API client so the auth token is attached automatically.
 *
 * Endpoints consumed:
 *   GET /api/customers          — list customers (search + pagination, auth)
 *   GET /api/customers/{id}     — one customer + order history (auth)
 *
 * Write ops (create/update customers) are future work on the backend and are
 * intentionally not exposed here.
 */

import { apiClient } from "@/lib/api/client";
import type {
  CustomerDetailRecord,
  CustomerListParams,
  CustomerRecord,
  PageResult,
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

/** List customers (most recently updated first) with optional search + pagination. */
export async function getCustomers(
  params: CustomerListParams = {}
): Promise<PageResult<CustomerRecord>> {
  return apiClient.get<PageResult<CustomerRecord>>(
    `/api/customers${toQuery(params)}`
  );
}

/** Get one customer including their order history (newest first). */
export async function getCustomer(
  customerId: string
): Promise<CustomerDetailRecord> {
  return apiClient.get<CustomerDetailRecord>(`/api/customers/${customerId}`);
}