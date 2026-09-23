/**
 * RealtimeClient
 * =============
 * A single, tightly-bounded WebSocket client for admin sessions.
 *
 * Behavior
 * --------
 * - Opens the socket and immediately sends `{"type":"auth","token":...}`.
 * - Waits for `auth_ok`; emits `error` frames are treated as terminal
 *   (invalid/expired token) and the client stops reconnecting.
 * - Reconnects with exponential backoff (1, 2, 4, 8 … capped at
 *   `maxBackoffMs`, default 30s) after an unexpected close.
 * - After every successful (re)connect, calls `onConnected` so pages refetch
 *   authoritative REST state — this guarantees no events are missed during a
 *   disconnection window.
 * - Never puts the token in the URL. `stop()` tears everything down on logout
 *   or unmount.
 */

export type RealtimeConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "closed";

import type { RealtimeEvent } from "./events";

export interface RealtimeClientOptions {
  token: string;
  url: string;
  onStatusChange: (status: RealtimeConnectionStatus) => void;
  onConnected: () => void;
  onEvent: (event: RealtimeEvent) => void;
  maxBackoffMs?: number;
  authTimeoutMs?: number;
}

const DEFAULT_MAX_BACKOFF_MS = 30_000;
const DEFAULT_AUTH_TIMEOUT_MS = 10_000;

export class RealtimeClient {
  private socket: WebSocket | null = null;
  private reconnectTimerId: number | null = null;
  private authTimerId: number | null = null;
  private attempt = 0;
  private closed = true;
  private readonly options: RealtimeClientOptions;

  constructor(options: RealtimeClientOptions) {
    this.options = options;
  }

  start(): void {
    if (this.socket) return;
    this.closed = false;
    this.attempt = 0;
    this.open();
  }

  stop(): void {
    this.closed = true;
    if (this.reconnectTimerId !== null) {
      window.clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = null;
    }
    if (this.authTimerId !== null) {
      window.clearTimeout(this.authTimerId);
      this.authTimerId = null;
    }
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      socket.onopen = null;
      try {
        socket.close();
      } catch {
        // Ignore close errors on teardown.
      }
    }
  }

  private backoffMs(): number {
    return Math.min(
      1000 * 2 ** this.attempt,
      this.options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS
    );
  }

  private open(): void {
    if (this.closed || typeof window === "undefined") return;

    const socket = new WebSocket(this.options.url);
    this.socket = socket;
    this.options.onStatusChange(this.attempt === 0 ? "connecting" : "reconnecting");

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "auth", token: this.options.token }));
      this.authTimerId = window.setTimeout(() => {
        // No auth_ok in time → the server is unreachable/silent. Treat as
        // terminal so we don't hammer a dead endpoint forever.
        this.closed = true;
        try {
          socket.close();
        } catch {
          // Ignore.
        }
      }, this.options.authTimeoutMs ?? DEFAULT_AUTH_TIMEOUT_MS);
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      let data: unknown;
      try {
        data = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (!data || typeof data !== "object") return;
      const message = data as Record<string, unknown>;

      if (message.type === "auth_ok") {
        if (this.authTimerId !== null) {
          window.clearTimeout(this.authTimerId);
          this.authTimerId = null;
        }
        this.attempt = 0;
        this.options.onStatusChange("connected");
        this.options.onConnected();
        return;
      }

      if (message.type === "error") {
        // Terminal server-side rejection (invalid/expired token).
        this.closed = true;
        this.options.onStatusChange("closed");
        try {
          socket.close();
        } catch {
          // Ignore.
        }
        return;
      }

      if (typeof message.type === "string") {
        this.options.onEvent(message as RealtimeEvent);
      }
    };

    socket.onclose = () => {
      if (this.authTimerId !== null) {
        window.clearTimeout(this.authTimerId);
        this.authTimerId = null;
      }
      if (this.socket === socket) this.socket = null;

      if (this.closed) {
        this.options.onStatusChange("closed");
        return;
      }

      const delay = this.backoffMs();
      this.attempt += 1;
      this.options.onStatusChange("reconnecting");
      this.reconnectTimerId = window.setTimeout(() => {
        this.reconnectTimerId = null;
        this.open();
      }, delay);
    };
  }
}