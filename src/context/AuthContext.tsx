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
  fetchCurrentUser,
  login as loginRequest,
  logout as clearSession,
} from "@/lib/auth/auth-service";
import { UNAUTHORIZED_EVENT } from "@/lib/api/client";
import type { AuthUser, LoginCredentials } from "@/lib/auth/types";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /**
   * True while the session is being restored on mount (page refresh / first
   * render). Consumers must wait for this to resolve before deciding where to
   * navigate so the app never flashes an authenticated dashboard before
   * redirecting.
   */
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore the session after a page refresh / initial load.
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      try {
        const currentUser = await fetchCurrentUser();
        if (!cancelled) {
          setUser(currentUser);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  // Central 401 handling: any API call rejected with 401 (with a token
  // attached) clears the stored token in the client and notifies here.
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const currentUser = await loginRequest(credentials);
    setUser(currentUser);
    return currentUser;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      logout,
    }),
    [user, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}