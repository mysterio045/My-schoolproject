"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getRiderProfile,
  loginRider,
  logoutRider,
  registerRider,
  type RiderLoginPayload,
  type RiderProfile,
  type RiderRegisterPayload,
} from "@/lib/api";
import { getStoredToken } from "@/lib/api/client";

interface AuthContextValue {
  rider: RiderProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: RiderLoginPayload) => Promise<void>;
  register: (payload: RiderRegisterPayload) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [rider, setRider] = useState<RiderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setRider(null);
      setIsLoading(false);
      return;
    }

    try {
      const profile = await getRiderProfile();
      setRider(profile);
    } catch {
      logoutRider();
      setRider(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const login = useCallback(async (payload: RiderLoginPayload) => {
    await loginRider(payload);
    const profile = await getRiderProfile();
    setRider(profile);
  }, []);

  const register = useCallback(async (payload: RiderRegisterPayload) => {
    await registerRider(payload);
  }, []);

  const logout = useCallback(() => {
    logoutRider();
    setRider(null);
  }, []);

  const value = useMemo(
    () => ({
      rider,
      isLoading,
      isAuthenticated: !!rider,
      login,
      register,
      logout,
      refreshProfile: fetchProfile,
    }),
    [rider, isLoading, login, register, logout, fetchProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
