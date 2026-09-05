"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoadingState from "@/components/ui/LoadingState";

/**
 * Client-side guard for authenticated areas.
 *
 * - While the session is being restored, a loading state is rendered so the
 *   authenticated UI never flashes before we know the auth state.
 * - Once resolved, unauthenticated visitors are sent to `/login` (via the
 *   router, never a render-time redirect, so no loop/hydration surprise).
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}