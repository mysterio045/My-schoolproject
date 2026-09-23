"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { getStoredToken } from "@/lib/auth/token";
import { RealtimeClient, type RealtimeConnectionStatus } from "@/lib/realtime/client";
import { getRealtimeUrl } from "@/lib/realtime/socket-url";
import { REALTIME_EVENTS, type RealtimeEvent } from "@/lib/realtime/events";

type EventHandler = (event: RealtimeEvent) => void;

interface RealtimeContextType {
  status: RealtimeConnectionStatus;
  isConnected: boolean;
  subscribe: (type: string, handler: EventHandler) => void;
  unsubscribe: (type: string, handler: EventHandler) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

/**
 * Owns the single realtime WebSocket connection for the admin session.
 *
 * - Connects once the session is restored and authenticated.
 * - Disconnects on logout / unmount.
 * - Dispatches inbound events to subscribers; on every (re)connect it emits a
 *   synthetic `realtime.connected` event so mounted pages refetch the
 *   authoritative REST state (no events lost during a disconnect window).
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [status, setStatus] = useState<RealtimeConnectionStatus>("idle");
  const clientRef = useRef<RealtimeClient | null>(null);
  const generationRef = useRef(0);
  const subscribersRef = useRef<Map<string, Set<EventHandler>>>(new Map());

  const subscribe = useCallback((type: string, handler: EventHandler) => {
    let handlers = subscribersRef.current.get(type);
    if (!handlers) {
      handlers = new Set();
      subscribersRef.current.set(type, handlers);
    }
    handlers.add(handler);
  }, []);

  const unsubscribe = useCallback((type: string, handler: EventHandler) => {
    subscribersRef.current.get(type)?.delete(handler);
  }, []);

  const dispatch = useCallback((event: RealtimeEvent) => {
    const handlers = subscribersRef.current.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => handler(event));
    }
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!isAuthenticated) {
      generationRef.current += 1;
      clientRef.current?.stop();
      clientRef.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("idle");
      return;
    }

    const token = getStoredToken();
    if (!token) {
      return;
    }

    const generation = ++generationRef.current;
    const client = new RealtimeClient({
      token,
      url: getRealtimeUrl(),
      onStatusChange: (next) => {
        if (generation === generationRef.current) setStatus(next);
      },
      onConnected: () => {
        if (generation === generationRef.current) {
          dispatch({ type: REALTIME_EVENTS.CONNECTED });
        }
      },
      onEvent: (event) => {
        if (generation === generationRef.current) dispatch(event);
      },
    });
    clientRef.current = client;
    // Defer opening until after the effect runs so the synchronous
    // status transition does not trip the react-hooks/set-state-in-effect
    // lint rule (and so unmount-before-start is handled by the generation guard).
    queueMicrotask(() => {
      if (generation === generationRef.current) client.start();
    });

    return () => {
      generationRef.current += 1;
      if (clientRef.current === client) clientRef.current = null;
      client.stop();
    };
  }, [isAuthenticated, isLoading, dispatch]);

  const value = useMemo<RealtimeContextType>(
    () => ({
      status,
      isConnected: status === "connected",
      subscribe,
      unsubscribe,
    }),
    [status, subscribe, unsubscribe]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextType {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return ctx;
}