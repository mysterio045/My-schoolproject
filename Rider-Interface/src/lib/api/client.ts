/**
 * API Client
 * ==========
 * Base HTTP client for communicating with the FastAPI backend.
 * Handles token storage, request headers, and error extraction.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "sfo_rider_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function extractErrorMessage(status: number, detail: unknown): string {
  if (status === 422 && Array.isArray(detail)) {
    const messages = detail
      .map((issue: { msg?: string }) => issue?.msg)
      .filter((m): m is string => typeof m === "string" && m.length > 0);
    if (messages.length > 0) return messages.join(". ");
    return "The submitted data is invalid.";
  }

  if (detail && typeof detail === "object" && "detail" in detail) {
    const d = (detail as { detail: unknown }).detail;
    if (typeof d === "string") return d;
  }

  const STATUS_MESSAGES: Record<number, string> = {
    400: "Bad request. Please check the submitted data.",
    401: "You are not authenticated or your session has expired.",
    403: "You are not authorized to perform this action.",
    404: "The requested resource was not found.",
    409: "The request conflicts with the current state of the resource.",
    422: "The submitted data is invalid.",
    429: "Too many requests. Please try again shortly.",
  };

  return STATUS_MESSAGES[status] ?? "Something went wrong. Please try again.";
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  if (!skipAuth) {
    const token = getStoredToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      detail = null;
    }
    const message = extractErrorMessage(response.status, detail);
    throw new ApiError(response.status, message, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
