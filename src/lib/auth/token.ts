/**
 * Centralized JWT token storage.
 *
 * All reads/writes of the access token happen here so token handling is never
 * scattered across components. The value lives in `localStorage` (client only);
 * every accessor guards against SSR environments.
 */

const TOKEN_STORAGE_KEY = "sfo_access_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Storage may be unavailable (private mode / disabled cookies). The
    // session simply won't persist across refreshes in that case.
  }
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore — nothing to clean up in an unavailable storage.
  }
}