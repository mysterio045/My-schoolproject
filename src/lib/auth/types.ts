/**
 * Frontend types for the backend authentication endpoints.
 *
 * These mirror the FastAPI schemas:
 *   - `POST /api/auth/login`  -> TokenResponse (AdminLogin request)
 *   - `GET  /api/auth/me`     -> AdminRead
 */

export interface LoginCredentials {
  email: string;
  password: string;
}

/** Response from `POST /api/auth/login`. */
export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/** Response from `GET /api/auth/me` (the authenticated admin profile). */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}