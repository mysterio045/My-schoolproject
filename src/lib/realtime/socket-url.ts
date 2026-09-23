/**
 * WebSocket URL derivation.
 *
 * The socket endpoint lives on the same host as the REST API, so its URL is
 * derived from `NEXT_PUBLIC_API_URL` (http → ws, https → wss). The auth token
 * is never placed in the URL — it is sent in the first `auth` frame instead.
 */

import { API_BASE_URL } from "@/lib/api/client";

const FALLBACK_WS_URL = "ws://127.0.0.1:8000/ws";

export function getRealtimeUrl(): string {
  const base = (API_BASE_URL || "").replace(/\/+$/, "");
  if (base.startsWith("https://")) {
    return `wss://${base.slice("https://".length)}/ws`;
  }
  if (base.startsWith("http://")) {
    return `ws://${base.slice("http://".length)}/ws`;
  }
  return FALLBACK_WS_URL;
}