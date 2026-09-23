/**
 * Realtime React hooks — event-driven invalidation + conservative fallback
 * polling. Pages subscribe only to the events they render, and only poll when
 * the socket is disconnected, so the app never over-fetches.
 */

import { useEffect, useRef } from "react";
import { useRealtime } from "@/context/RealtimeContext";
import type { RealtimeEvent } from "./events";

/**
 * Subscribe to event types and invoke `callback` on each matching event.
 *
 * When `debounceMs` is set, bursts of events (e.g. dispatch firing several
 * events at once) are coalesced into a single invocation shortly after the
 * last one, preventing redundant refetches.
 */
export function useRealtimeEvents(
  types: readonly string[],
  callback: (event: RealtimeEvent) => void,
  options?: { debounceMs?: number }
): void {
  const { subscribe, unsubscribe } = useRealtime();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  const typesKey = types.join("|");

  useEffect(() => {
    let timerId: number | null = null;
    let latest: RealtimeEvent | null = null;

    const cleanups = types.map((type) => {
      const handler = (event: RealtimeEvent) => {
        if (options?.debounceMs) {
          latest = event;
          if (timerId !== null) window.clearTimeout(timerId);
          timerId = window.setTimeout(() => {
            timerId = null;
            callbackRef.current(latest as RealtimeEvent);
          }, options.debounceMs);
        } else {
          callbackRef.current(event);
        }
      };
      subscribe(type, handler);
      return () => unsubscribe(type, handler);
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      if (timerId !== null) {
        window.clearTimeout(timerId);
        timerId = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typesKey, subscribe, unsubscribe, options?.debounceMs]);
}

/**
 * Fallback polling: while the socket is disconnected, poll `callback` every
 * `intervalMs`. The moment the socket reconnects, polling stops and the
 * `realtime.connected` event drives a refetch instead.
 */
export function useFallbackPolling(
  intervalMs: number,
  callback: () => void,
  deps: readonly unknown[] = []
): void {
  const { isConnected } = useRealtime();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (isConnected) {
      return undefined;
    }
    const timerId = window.setInterval(() => {
      callbackRef.current();
    }, intervalMs);
    return () => window.clearInterval(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, intervalMs, ...deps]);
}