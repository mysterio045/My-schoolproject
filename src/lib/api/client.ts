/**
 * Centralized API client for the Smart Food Ordering backend.
 *
 * All HTTP calls to the backend go through here so fetch configuration,
 * JSON serialization, error mapping, and auth headers are never duplicated
 * across pages.
 *
 * The base URL comes from `NEXT_PUBLIC_API_URL`. The only local-backend
 * reference lives here as a dev fallback; everything else must set the env var.
 */

import { ApiError, extractErrorMessage } from "./errors";
import { getStoredToken, clearStoredToken } from "@/lib/auth/token";

export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

/**
 * Broadcast when a request was rejected with 401 while a token was attached,
 * so the auth provider can clear its state centrally.
 */
export const UNAUTHORIZED_EVENT = "sfo:unauthorized";

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** Serialized as JSON. Omitting it sends no body. */
  body?: unknown;
  /** Attach the stored Bearer token. Defaults to true. */
  auth?: boolean;
  /** Extra headers merged into the request (e.g. overrides). */
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, auth = true, headers, signal } = options;

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");
  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }

  let attachedToken = false;
  if (auth) {
    const token = getStoredToken();
    if (token) {
      attachedToken = true;
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      cache: "no-store",
    });
  } catch (error) {
    // Network-level failure (DNS / refused connection / offline).
    throw new ApiError(0, "Unable to reach the server. Please try again.", error);
  }

  if (!response.ok) {
    let detail: unknown = null;
    try {
      detail = await response.json();
    } catch {
      // Non-JSON body (e.g. proxy HTML error page).
    }

    if (response.status === 401 && attachedToken) {
      clearStoredToken();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      }
    }

    const message = extractErrorMessage(response.status, detail);
    throw new ApiError(response.status, message, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return undefined as T;
}

export const apiClient = {
  get<T>(path: string, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return request<T>(path, { ...options, method: "GET" });
  },
  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return request<T>(path, { ...options, method: "POST", body });
  },
  patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return request<T>(path, { ...options, method: "PATCH", body });
  },
  delete<T>(path: string, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return request<T>(path, { ...options, method: "DELETE" });
  },
};