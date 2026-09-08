/**
 * Notifications API — typed wrappers around the Phase 4C notification
 * endpoints (polymorphic recipients: admin / customer / rider).
 *
 * All calls go through the centralized Phase 5A API client.
 */

import { apiClient } from "@/lib/api/client";
import type {
  NotificationCreatePayload,
  NotificationListParams,
  NotificationRecipientType,
  NotificationRecord,
  NotificationUpdatePayload,
  PageResult,
  UnreadNotificationCount,
} from "@/lib/types";

function toQuery(params: object): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && (typeof value === "string" || typeof value === "number" || typeof value === "boolean")) {
      query.set(key, String(value));
    }
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

/** List notifications for a recipient (`recipient_type` + `recipient_id` required). */
export async function getNotifications(
  params: NotificationListParams
): Promise<PageResult<NotificationRecord>> {
  return apiClient.get<PageResult<NotificationRecord>>(
    `/api/notifications${toQuery(params)}`
  );
}

/** Unread count for a recipient. */
export async function getUnreadCount(
  recipient_type: NotificationRecipientType,
  recipient_id: string
): Promise<UnreadNotificationCount> {
  return apiClient.get<UnreadNotificationCount>(
    `/api/notifications/unread-count${toQuery({ recipient_type, recipient_id })}`
  );
}

/** Fetch a single notification by id. */
export async function getNotification(notificationId: string): Promise<NotificationRecord> {
  return apiClient.get<NotificationRecord>(`/api/notifications/${notificationId}`);
}

/** Mark a notification read (or unread when `read = false`). */
export async function markNotificationRead(
  notificationId: string,
  read: boolean = true
): Promise<NotificationRecord> {
  const payload: NotificationUpdatePayload = { read };
  return apiClient.patch<NotificationRecord>(
    `/api/notifications/${notificationId}/read`,
    payload
  );
}

/** Create a notification for a polymorphic recipient. */
export async function createNotification(
  payload: NotificationCreatePayload
): Promise<NotificationRecord> {
  return apiClient.post<NotificationRecord>(
    "/api/notifications",
    payload
  );
}