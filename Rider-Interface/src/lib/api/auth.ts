/**
 * Rider Auth API
 * ==============
 * Endpoints for rider registration, login, and profile.
 */

import { apiRequest, setStoredToken, clearStoredToken } from "./client";

export interface RiderRegisterPayload {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  password: string;
  vehicle_type?: string;
  vehicle_plate_number?: string;
}

export interface RiderLoginPayload {
  email: string;
  password: string;
}

export interface RiderTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface RiderProfile {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  phone: string;
  email: string;
  vehicle_type: string | null;
  vehicle_plate_number: string | null;
  status: "available" | "busy" | "offline";
  lat: number | null;
  lng: number | null;
  location_address: string | null;
  distance_from_restaurant: number | null;
  today_deliveries: number;
  completed_deliveries: number;
  average_delivery_time: number;
  rating: number;
  avatar: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface RiderAvailabilityPayload {
  status: "available" | "busy" | "offline";
}

export async function registerRider(
  payload: RiderRegisterPayload
): Promise<RiderProfile> {
  return apiRequest<RiderProfile>("/api/riders/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuth: true,
  });
}

export async function loginRider(
  payload: RiderLoginPayload
): Promise<RiderTokenResponse> {
  const response = await apiRequest<RiderTokenResponse>(
    "/api/riders/auth/login",
    {
      method: "POST",
      body: JSON.stringify(payload),
      skipAuth: true,
    }
  );
  setStoredToken(response.access_token);
  return response;
}

export async function getRiderProfile(): Promise<RiderProfile> {
  return apiRequest<RiderProfile>("/api/riders/auth/me");
}

export async function updateRiderAvailability(
  payload: RiderAvailabilityPayload
): Promise<RiderProfile> {
  return apiRequest<RiderProfile>("/api/riders/auth/me/availability", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function logoutRider(): void {
  clearStoredToken();
}
