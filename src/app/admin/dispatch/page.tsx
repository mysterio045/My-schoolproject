"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Package,
  Bike,
  MapPin,
  Clock,
  ArrowRight,
  X,
  CheckCircle,
  Navigation,
  Zap,
  AlertCircle,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { useApp } from "@/context/AppContext";
import { formatNaira, cn } from "@/lib/utils";
import { showToast } from "@/components/ui/Toast";
import { Order, Rider } from "@/lib/types";

export default function DispatchPage() {
  const { orders, riders, assignRider } = useApp();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const waitingOrders = useMemo(
    () => orders.filter((o) => o.status === "ready" || o.status === "pending"),
    [orders]
  );

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

  const selectedOrder = useMemo(
    () => (selectedOrderId ? orders.find((o) => o.id === selectedOrderId) ?? null : null),
    [selectedOrderId, orders]
  );

  const nearestRider = useMemo((): Rider | null => {
    if (availableRiders.length === 0) return null;
    return availableRiders.reduce((closest, rider) =>
      rider.distanceFromRestaurant < closest.distanceFromRestaurant ? rider : closest
    );
  }, [availableRiders]);

  const handleAssign = useCallback(() => {
    if (!selectedOrder || !nearestRider) return;

    assignRider(selectedOrder.id, nearestRider.id);
    showToast("success", `${nearestRider.name} assigned to ${selectedOrder.id}`);
    setSelectedOrderId(null);
  }, [selectedOrder, nearestRider, assignRider]);

  const handleCancelSelection = useCallback(() => {
    setSelectedOrderId(null);
  }, []);

  return (
    <div className="space-y-6">
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
              {waitingOrders.length} Waiting
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
                  {waitingOrders.length} order{waitingOrders.length !== 1 ? "s" : ""} pending assignment
                </p>
              </div>
            </div>
          </div>

          <div className="max-h-[calc(100vh-340px)] overflow-y-auto">
            {waitingOrders.length === 0 ? (
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
                {waitingOrders.map((order) => {
                  const isSelected = selectedOrderId === order.id;
                  return (
                    <button
                      key={order.id}
                      onClick={() => setSelectedOrderId(isSelected ? null : order.id)}
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
                              {order.id}
                            </p>
                            <StatusBadge status={order.status} />
                          </div>
                          <p className="mt-1.5 text-[13px] text-[var(--foreground)]">
                            {order.customerName}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)]">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{order.deliveryAddress}</span>
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <span className="text-[12px] font-medium text-[var(--foreground)]">
                              {formatNaira(order.total)}
                            </span>
                            <span className="text-[11px] text-[var(--muted-foreground)]">
                              {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                            </span>
                            <span className="text-[11px] text-[var(--muted-foreground)]">
                              {order.createdAtLabel ?? "Just now"}
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
                            {rider.avatar}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-semibold text-[var(--foreground)]">
                              {rider.name}
                            </p>
                            {nearestRider?.id === rider.id && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                <Zap className="h-2.5 w-2.5" />
                                NEAREST
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-[var(--muted-foreground)]">
                            <div className="flex items-center gap-1">
                              <Navigation className="h-3 w-3" />
                              <span>{rider.distanceFromRestaurant} km away</span>
                            </div>
                            <span>·</span>
                            <span>{rider.todayDeliveries} deliveries today</span>
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
                            {rider.avatar}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[var(--foreground)]">
                            {rider.name}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-[var(--muted-foreground)]">
                            <div className="flex items-center gap-1">
                              <Navigation className="h-3 w-3" />
                              <span>{rider.distanceFromRestaurant} km away</span>
                            </div>
                            <span>·</span>
                            <span className="truncate">
                              {rider.currentOrderIds.length > 0
                                ? `${rider.currentOrderIds.length} order${rider.currentOrderIds.length !== 1 ? "s" : ""} active`
                                : "No active orders"}
                            </span>
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
                            {rider.avatar}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[var(--foreground)]">
                            {rider.name}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-[var(--muted-foreground)]">
                            <div className="flex items-center gap-1">
                              <Navigation className="h-3 w-3" />
                              <span>{rider.distanceFromRestaurant} km away</span>
                            </div>
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
      {selectedOrder && (
        <div className="rounded-xl border border-[var(--primary)]/20 bg-[var(--card)] overflow-hidden shadow-lg shadow-[var(--primary)]/5">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                <Navigation className="h-4 w-4 text-[var(--primary)]" />
              </div>
              <h2 className="text-[13px] font-semibold text-[var(--foreground)]">
                Assignment for {selectedOrder.id}
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Order Info */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                  Order Details
                </p>
                <p className="text-[14px] font-bold text-[var(--foreground)]">
                  {selectedOrder.id}
                </p>
                <p className="mt-1 text-[13px] text-[var(--foreground)]">
                  {selectedOrder.customerName}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)]">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{selectedOrder.deliveryAddress}</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[12px]">
                  <span className="font-medium text-[var(--foreground)]">
                    {formatNaira(selectedOrder.total)}
                  </span>
                  <span className="text-[var(--muted-foreground)]">
                    · {selectedOrder.items.length} item{selectedOrder.items.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Nearest Rider Recommendation */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                  Nearest Available Rider
                </p>
                {nearestRider ? (
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10">
                        <span className="text-[12px] font-bold text-[var(--primary)]">
                          {nearestRider.avatar}
                        </span>
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-[var(--foreground)]">
                          {nearestRider.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)]">
                          <Navigation className="h-3 w-3" />
                          <span>{nearestRider.distanceFromRestaurant} km from restaurant</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-[12px]">
                      <span className="text-[var(--muted-foreground)]">
                        ⭐ {nearestRider.rating}
                      </span>
                      <span className="text-[var(--muted-foreground)]">
                        {nearestRider.todayDeliveries} deliveries today
                      </span>
                      <span className="text-[var(--muted-foreground)]">
                        {nearestRider.averageDeliveryTime} min avg
                      </span>
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
                  onClick={handleAssign}
                  disabled={!nearestRider}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-medium transition-all",
                    nearestRider
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 shadow-sm"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed opacity-60"
                  )}
                >
                  <CheckCircle className="h-4 w-4" />
                  Assign Rider
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
