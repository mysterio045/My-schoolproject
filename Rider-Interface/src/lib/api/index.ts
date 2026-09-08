/**
 * API Module
 * ==========
 * Re-exports all API functions and types.
 */

export {
  apiRequest,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  ApiError,
} from "./client";

export {
  registerRider,
  loginRider,
  getRiderProfile,
  updateRiderAvailability,
  logoutRider,
  type RiderRegisterPayload,
  type RiderLoginPayload,
  type RiderTokenResponse,
  type RiderProfile,
  type RiderAvailabilityPayload,
} from "./auth";
