/**
 * Authentication service — the single place that talks to the backend auth
 * endpoints and manages token persistence.
 *
 * Flow:
 *   1. `login()`        POST /api/auth/login -> stores the JWT -> fetches /me
 *   2. `fetchCurrentUser()` reads the stored token and validates it via /me
 *   3. `logout()`       clears the stored token
 */

import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from "@/lib/auth/token";
import type { AuthUser, LoginCredentials, LoginResponse } from "@/lib/auth/types";

/**
 * Authenticate with email/password.
 *
 * @returns the authenticated admin profile.
 * @throws ApiError on failure (e.g. 401 invalid credentials).
 */
export async function login(
  credentials: LoginCredentials
): Promise<AuthUser> {
  const response = await apiClient.post<LoginResponse>(
    "/api/auth/login",
    credentials,
    { auth: false }
  );
  setStoredToken(response.access_token);
  return apiClient.get<AuthUser>("/api/auth/me");
}

/**
 * Resolve the currently authenticated user.
 *
 * Returns `null` when there is no stored token. When the token is present but
 * invalid/expired, the backend answers 401, the client clears the token, and
 * `null` is returned; the auth provider is notified centrally by the client.
 *
 * @throws ApiError for any non-401 server error.
 */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = getStoredToken();
  if (!token) {
    return null;
  }
  try {
    return await apiClient.get<AuthUser>("/api/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthorized) {
      return null;
    }
    throw error;
  }
}

/** Drop the stored token. State clearing on the UI side is the provider's job. */
export function logout(): void {
  clearStoredToken();
}