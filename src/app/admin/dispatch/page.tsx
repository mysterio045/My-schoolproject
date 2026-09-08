"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Package,
  Bike,
  MapPin,
  Clock,
  ArrowRight,
  X,
  CheckCircle,
  Navigation,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingState from "@/components/ui/LoadingState";
import { cn, formatNaira, getInitials, getTimeAgo } from "@/lib/utils";
import { showToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/api/errors";
import { getDeliveries } from "@/lib/api/deliveries";
import { getRiders } from "@/lib/api/riders";
import { assignRider } from "@/lib/api/dispatch";
import type {
  DeliveryRecord,
  DeliveryStatus,
  DispatchResult,
  OrderRecord,
  RiderRecord,
} from "@/lib/types";

const MAX_ROWS = 100;

function deliveryStatusLabel(status: DeliveryStatus): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function deliveryStatusTone(status: DeliveryStatus): string {
  switch (status) {
    case "delivered":
      return "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400";
    case "failed":
      return "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400";
    case "pending":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    case "assigned":
      return "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400";
    case "accepted":
      return "bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400";
    case "picked_up":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400";
    case "on_the_way":
      return "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400";
  }
}

interface DispatchItem {
  delivery: DeliveryRecord;
  order: OrderRecord;
}

export default function DispatchPage() {
  const [waiting, setWaiting] = useState<DispatchItem[]>([]);
  const [riders, setRiders] = useState<RiderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DispatchItem | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [lastDispatch, setLastDispatch] = useState<DispatchResult | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const [deliveriesRes, ridersRes] = await Promise.all([
        getDeliveries({ page: 1, page_size: MAX_ROWS, status: "pending" }),
        getRiders({ page: 1, page_size: MAX_ROWS }),
      ]);
      const items = deliveriesRes.items
        .map((d) => ({ delivery: d, order: d.order }))
        .filter(
          (x): x is DispatchItem => !!x.order && x.order.status === "ready"
        );
      setWaiting(items);
      setRiders(ridersRes.items);
      if (!silent) setLoadError(null);
    } catch (err) {
      const message = getErrorMessage(err);
      if (silent) showToast("error", message);
      else setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const availableRiders = useMemo(
    () => riders.filter((r) => r.status === "available"),
    [riders]
  );
  const busyRiders = useMemo(
    () => riders.filter((r) => r.status === "busy"),
    [riders]
  );
  const offlineRiders = useMemo(
    () => riders.filter((r) => r.status === "offline"),
    [riders]
  );

  const selectedDispatch = useMemo(
    () =>
      lastDispatch && selected?.order.id === lastDispatch.delivery.order_id
        ? lastDispatch
        : null,
    [lastDispatch, selected]
  );

  const handleSelect = (item: DispatchItem) => {
    setAssignmentError(null);
    setLastDispatch(null);
    setSelected((prev) => (prev?.delivery.id === item.delivery.id ? null : item));
  };

  const handleCancelSelection = useCallback(() => {
    setSelected(null);
    setAssignmentError(null);
  }, []);

  const handleAssign = useCallback(async () => {
    if (!selected || assigning) return;
    setAssigning(true);
    setAssignmentError(null);
    try {
      const result = await assignRider(selected.order.id);
      setLastDispatch(result);
      setSelected({
        delivery: result.delivery,
        order: result.delivery.order ?? selected.order,
      });
      showToast(
        "success",
        `${result.rider.name} assigned to ${result.delivery.order?.order_number ?? selected.order.order_number}`
      );
      void load(true);
    } catch (err) {
      const message = getErrorMessage(err);
      setAssignmentError(message);
      showToast("error", message);
      void load(true);
    } finally {
      setAssigning(false);
    }
  }, [selected, assigning, load]);

  const canAssign = !!selected && !assigning && selected.order.status === "ready";

  if (loading && waiting.length === 0 && riders.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <LoadingState />
      </div>
    );
  }

  if (loadError && waiting.length === 0 && riders.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] py-16">
          <p className="text-[13px] text-[var(--muted-foreground)]">{loadError}</p>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loadError && (waiting.length > 0 || riders.length > 0) && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[12px] text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{loadError}</span>
          <button
            onClick={() => void load()}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium hover:underline"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Dispatch</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
            Assign riders to orders and manage deliveries in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start">
          <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-[13px] font-medium text-[var(--foreground)]">
              {availableRiders.length} Available
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-[13px] font-medium text-[var(--foreground)]">
              {waiting.length} Waiting
            </span>
          </div>
        </div>
      </div>

      {/* Split Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Orders Waiting for Riders */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]">
                <Package className="h-4 w-4 text-[var(--muted-foreground)]" />
              </div>
              <div>
                <h2 className="text-[13px] font-semibold text-[var(--foreground)]">
                  Orders Waiting for Riders
                </h2>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  {waiting.length} order{waiting.length !== 1 ? "s" : ""} pending assignment
                </p>
              </div>
            </div>
          </div>

          <div className="max-h-[calc(100vh-340px)] overflow-y-auto">
            {waiting.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 px-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]">
                  <CheckCircle className="h-6 w-6 text-[var(--muted-foreground)] opacity-40" />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-medium text-[var(--foreground)]">
                    All orders assigned
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">
                    No orders are waiting for rider assignment.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {waiting.map(({ delivery, order }) => {
                  const isSelected = selected?.delivery.id === delivery.id;
                  return (
                    <button
                      key={delivery.id}
                      onClick={() => handleSelect({ delivery, order })}
                      className={cn(
                        "w-full text-left px-5 py-4 transition-colors",
                        isSelected
                          ? "bg-[var(--primary)]/5 border-l-2 border-l-[var(--primary)]"
                          : "hover:bg-[var(--accent)]/50 border-l-2 border-l-transparent"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5">
                            <p className="text-[13px] font-semibold text-[var(--foreground)]">
                              {order.order_number}
                            </p>
                            <StatusBadge status={order.status} />
                          </div>
                          <p className="mt-1.5 text-[13px] text-[var(--foreground)]">
                            {order.customer_name}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)]">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {order.delivery_address}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <span className="text-[12px] font-medium text-[var(--foreground)]">
                              {formatNaira(order.total)}
                            </span>
                            <span className="text-[11px] text-[var(--muted-foreground)]">
                              {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                            </span>
                            <span className="text-[11px] text-[var(--muted-foreground)]">
                              {getTimeAgo(order.created_at)}
                            </span>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors",
                            isSelected
                              ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                              : "bg-[var(--accent)] text-[var(--muted-foreground)]"
                          )}
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Available Riders */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]">
                <Bike className="h-4 w-4 text-[var(--muted-foreground)]" />
              </div>
              <div>
                <h2 className="text-[13px] font-semibold text-[var(--foreground)]">
                  Available Riders
                </h2>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  {availableRiders.length} rider{availableRiders.length !== 1 ? "s" : ""} available for dispatch
                </p>
              </div>
            </div>
          </div>

          <div className="max-h-[calc(100vh-340px)] overflow-y-auto">
            {/* Available Riders */}
            {availableRiders.length > 0 && (
              <div>
                <div className="px-5 py-2.5 bg-emerald-50/50 dark:bg-emerald-900/10 border-b border-[var(--border)]">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Available ({availableRiders.length})
                  </p>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {availableRiders.map((rider) => (
                    <div
                      key={rider.id}
                      className="px-5 py-3.5 hover:bg-[var(--accent)]/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]">
                          <span className="text-[12px] font-semibold text-[var(--foreground)]">
                            {rider.avatar ?? getInitials(rider.name)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[var(--foreground)]">
                            {rider.name}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-[var(--muted-foreground)]">
                            {rider.distance_from_restaurant !== null && (
                              <div className="flex items-center gap-1">
                                <Navigation className="h-3 w-3" />
                                <span>
                                  {rider.distance_from_restaurant.toFixed(1)} km away
                                </span>
                              </div>
                            )}
                            <span>·</span>
                            <span>{rider.today_deliveries} deliveries today</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <StatusBadge status={rider.status} />
                          <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                            ⭐ {rider.rating}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Busy Riders */}
            {busyRiders.length > 0 && (
              <div>
                <div className="px-5 py-2.5 bg-amber-50/50 dark:bg-amber-900/10 border-b border-[var(--border)]">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Busy ({busyRiders.length})
                  </p>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {busyRiders.map((rider) => (
                    <div
                      key={rider.id}
                      className="px-5 py-3.5 hover:bg-[var(--accent)]/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]">
                          <span className="text-[12px] font-semibold text-[var(--foreground)]">
                            {rider.avatar ?? getInitials(rider.name)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[var(--foreground)]">
                            {rider.name}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-[var(--muted-foreground)]">
                            {rider.distance_from_restaurant !== null && (
                              <div className="flex items-center gap-1">
                                <Navigation className="h-3 w-3" />
                                <span>
                                  {rider.distance_from_restaurant.toFixed(1)} km away
                                </span>
                              </div>
                            )}
                            <span>·</span>
                            <span>{rider.today_deliveries} deliveries today</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <StatusBadge status={rider.status} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Offline Riders */}
            {offlineRiders.length > 0 && (
              <div>
                <div className="px-5 py-2.5 bg-gray-50/50 dark:bg-gray-800/30 border-b border-[var(--border)]">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Offline ({offlineRiders.length})
                  </p>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {offlineRiders.map((rider) => (
                    <div
                      key={rider.id}
                      className="px-5 py-3.5 opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]">
                          <span className="text-[12px] font-semibold text-[var(--foreground)]">
                            {rider.avatar ?? getInitials(rider.name)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[var(--foreground)]">
                            {rider.name}
                          </p>
                          {rider.distance_from_restaurant !== null && (
                            <div className="mt-0.5 flex items-center gap-2 text-[12px] text-[var(--muted-foreground)]">
                              <div className="flex items-center gap-1">
                                <Navigation className="h-3 w-3" />
                                <span>
                                  {rider.distance_from_restaurant.toFixed(1)} km away
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <StatusBadge status={rider.status} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No riders at all */}
            {riders.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 px-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]">
                  <Bike className="h-6 w-6 text-[var(--muted-foreground)] opacity-40" />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-medium text-[var(--foreground)]">
                    No riders found
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">
                    There are no riders registered in the system.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Assignment Panel */}
      {selected && (
        <div className="rounded-xl border border-[var(--primary)]/20 bg-[var(--card)] overflow-hidden shadow-lg shadow-[var(--primary)]/5">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                <Navigation className="h-4 w-4 text-[var(--primary)]" />
              </div>
              <h2 className="text-[13px] font-semibold text-[var(--foreground)]">
                Assignment for {selected.order.order_number}
              </h2>
            </div>
            <button
              onClick={handleCancelSelection}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 py-5">
            {assignmentError && (
              <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">{assignmentError}</p>
                  <p className="mt-0.5 opacity-80">
                    No rider was assigned. This order remains in the queue.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Order Info */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                  Order Details
                </p>
                <p className="text-[14px] font-bold text-[var(--foreground)]">
                  {selected.order.order_number}
                </p>
                <p className="mt-1 text-[13px] text-[var(--foreground)]">
                  {selected.order.customer_name}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)]">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{selected.order.delivery_address}</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[12px]">
                  <span className="font-medium text-[var(--foreground)]">
                    {formatNaira(selected.order.total)}
                  </span>
                  <span className="text-[var(--muted-foreground)]">
                    · {selected.order.items.length} item{selected.order.items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium",
                      deliveryStatusTone(selected.delivery.status)
                    )}
                  >
                    Delivery: {deliveryStatusLabel(selected.delivery.status)}
                  </span>
                  {selected.delivery.assigned_at && (
                    <span className="text-[11px] text-[var(--muted-foreground)]">
                      {new Date(selected.delivery.assigned_at).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Nearest Rider Recommendation */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                  Nearest Available Rider
                </p>
                {selectedDispatch ? (
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10">
                        <span className="text-[12px] font-bold text-[var(--primary)]">
                          {selectedDispatch.rider.avatar ??
                            getInitials(selectedDispatch.rider.name)}
                        </span>
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-[var(--foreground)]">
                          {selectedDispatch.rider.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)]">
                          <Navigation className="h-3 w-3" />
                          <span>
                            {selectedDispatch.distance_km.toFixed(2)} km from restaurant
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-[12px]">
                      <span className="text-[var(--muted-foreground)]">
                        ⭐ {selectedDispatch.rider.rating}
                      </span>
                      <span className="text-[var(--muted-foreground)]">
                        {selectedDispatch.rider.today_deliveries} deliveries today
                      </span>
                      <span className="text-[var(--muted-foreground)]">
                        {selectedDispatch.rider.average_delivery_time} min avg
                      </span>
                    </div>
                    <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                      {selectedDispatch.message}
                    </div>
                  </div>
                ) : availableRiders.length > 0 ? (
                  <div>
                    <p className="text-[12px] text-[var(--muted-foreground)]">
                      {availableRiders.length} rider{availableRiders.length !== 1 ? "s" : ""} available —
                      the nearest eligible rider is chosen live by the backend
                      at dispatch time.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {availableRiders.map((rider) => (
                        <div
                          key={rider.id}
                          className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5"
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]">
                            <span className="text-[10px] font-semibold text-[var(--foreground)]">
                              {rider.avatar ?? getInitials(rider.name)}
                            </span>
                          </div>
                          <div>
                            <p className="text-[12px] font-medium text-[var(--foreground)]">
                              {rider.name}
                            </p>
                            <p className="text-[10px] text-[var(--muted-foreground)]">
                              {rider.today_deliveries} today
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-3">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <p className="text-[13px] text-[var(--muted-foreground)]">
                      No available riders at the moment.
                    </p>
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="flex flex-col justify-center gap-3">
                <button
                  onClick={() => void handleAssign()}
                  disabled={assigning || !canAssign}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-medium transition-all",
                    assigning || !canAssign
                      ? "bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed opacity-60"
                      : "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 shadow-sm"
                  )}
                >
                  {assigning ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  {assigning ? "Assigning…" : "Assign Rider"}
                </button>
                <button
                  onClick={handleCancelSelection}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-5 py-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}