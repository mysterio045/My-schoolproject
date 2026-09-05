/**
 * Dashboard API
 * =============
 * Functions for the admin dashboard summary, using the centralized API client
 * so the auth token is attached automatically.
 */

import { apiClient } from "@/lib/api/client";
import type { DashboardSummary } from "@/lib/types";

/**
 * Fetch the dashboard summary (stat counts + recent orders + recent
 * notifications) from the backend. Auth header is handled by the client.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiClient.get<DashboardSummary>("/api/dashboard/summary");
}
