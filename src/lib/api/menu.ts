/**
 * Menu API
 * ========
 * Typed functions for the Phase 4A menu endpoints, using the centralized API
 * client so the auth token is attached automatically.
 *
 * Endpoints consumed:
 *   GET   /api/menu/categories             — list categories
 *   POST  /api/menu/categories             — create category (auth)
 *   PATCH /api/menu/categories/{category_id} — update category (auth)
 *   GET   /api/menu                        — list items (paged + category filter)
 *   GET   /api/menu/{item_id}              — get one item
 *   POST  /api/menu                        — create item (auth)
 *   PATCH /api/menu/{item_id}              — update item (auth)
 *   PATCH /api/menu/{item_id}/toggle       — toggle availability (auth)
 *
 * The backend exposes NO delete endpoints for categories or items, so no
 * delete helpers exist here.
 */

import { apiClient } from "@/lib/api/client";
import type {
  MenuCategoryCreatePayload,
  MenuCategoryRecord,
  MenuCategoryUpdatePayload,
  MenuItemCreatePayload,
  MenuItemListParams,
  MenuItemRecord,
  MenuItemUpdatePayload,
  PageResult,
} from "@/lib/types";

/** List all categories, ordered by sort_order then name. */
export async function getMenuCategories(): Promise<MenuCategoryRecord[]> {
  return apiClient.get<MenuCategoryRecord[]>("/api/menu/categories");
}

/** Create a category. Returns HTTP 409 on duplicate name. */
export async function createMenuCategory(
  payload: MenuCategoryCreatePayload
): Promise<MenuCategoryRecord> {
  return apiClient.post<MenuCategoryRecord>("/api/menu/categories", payload);
}

/** Update a category (all fields optional). */
export async function updateMenuCategory(
  categoryId: string,
  payload: MenuCategoryUpdatePayload
): Promise<MenuCategoryRecord> {
  return apiClient.patch<MenuCategoryRecord>(
    `/api/menu/categories/${categoryId}`,
    payload
  );
}

/** List menu items with pagination and optional category/availability filter. */
export async function getMenuItems(
  params: MenuItemListParams = {}
): Promise<PageResult<MenuItemRecord>> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (
      value !== undefined &&
      (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    ) {
      query.set(key, String(value));
    }
  }
  const qs = query.toString();
  return apiClient.get<PageResult<MenuItemRecord>>(`/api/menu${qs ? `?${qs}` : ""}`);
}

/** Get one menu item, or HTTP 404. */
export async function getMenuItem(itemId: string): Promise<MenuItemRecord> {
  return apiClient.get<MenuItemRecord>(`/api/menu/${itemId}`);
}

/** Create a menu item, or HTTP 404 if the category is missing. */
export async function createMenuItem(
  payload: MenuItemCreatePayload
): Promise<MenuItemRecord> {
  return apiClient.post<MenuItemRecord>("/api/menu", payload);
}

/** Update a menu item (all fields optional). */
export async function updateMenuItem(
  itemId: string,
  payload: MenuItemUpdatePayload
): Promise<MenuItemRecord> {
  return apiClient.patch<MenuItemRecord>(`/api/menu/${itemId}`, payload);
}

/** Flip a menu item between available and unavailable. */
export async function toggleMenuItem(itemId: string): Promise<MenuItemRecord> {
  return apiClient.patch<MenuItemRecord>(`/api/menu/${itemId}/toggle`);
}