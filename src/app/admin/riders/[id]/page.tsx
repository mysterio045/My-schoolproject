"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Bike,
  Star,
  Clock,
  CheckCircle,
  Navigation,
  PackageCheck,
  Calendar,
  Activity,
  UserPlus,
  X,
  RefreshCw,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingState from "@/components/ui/LoadingState";
import { cn, getInitials, getTimeAgo } from "@/lib/utils";
import { ApiError, getErrorMessage } from "@/lib/api/errors";
import { getRider, updateRiderStatus } from "@/lib/api/riders";
import { showToast } from "@/components/ui/Toast";
import type { DeliveryStatus, RiderRecord, RiderStatus } from "@/lib/types";

const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = [
  "assigned",
  "accepted",
  "picked_up",
  "on_the_way",
];

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

export default function RiderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [rider, setRider] = useState<RiderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const loadRider = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      setRider(await getRider(id));
    } catch (err) {
      if (err instanceof ApiError && err.isNotFound) setNotFound(true);
      else setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRider();
  }, [loadRider]);

  const handleSetStatus = async (status: RiderStatus) => {
    if (!rider) return;
    try {
      const updated = await updateRiderStatus(id, status);
      setRider(updated);
      showToast("success", `${updated.name} is now ${status}`);
    } catch (err) {
      showToast("error", getErrorMessage(err));
      void loadRider();
    }
  };

  const handleAssignOrder = () => {
    if (!rider) return;
    showToast("success", `Assign order flow initiated for ${rider.name}`);
  };

  const activeDeliveries = useMemo(
    () =>
      (rider?.deliveries ?? []).filter((d) =>
        ACTIVE_DELIVERY_STATUSES.includes(d.status)
      ),
    [rider]
  );

  const deliveryHistory = useMemo(
    () =>
      [...(rider?.deliveries ?? [])].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [rider]
  );

  const backLink = (
    <Link
      href="/admin/riders"
      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Riders
    </Link>
  );

  if (loading && !rider) {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <LoadingState />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] py-16">
          <Bike className="h-12 w-12 text-[var(--muted-foreground)] opacity-40" />
          <div className="text-center">
            <p className="text-[15px] font-semibold text-[var(--foreground)]">
              Rider not found
            </p>
            <p className="text-[13px] text-[var(--muted-foreground)]">
              The rider you&apos;re looking for doesn&apos;t exist.
            </p>
          </div>
          <Link
            href="/admin/riders"
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
          >
            View All Riders
          </Link>
        </div>
      </div>
    );
  }

  if (error && !rider) {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] py-16">
          <p className="text-[13px] text-[var(--muted-foreground)]">{error}</p>
          <button
            onClick={() => void loadRider()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!rider) {
    return null;
  }

  const joinedDate = new Date(rider.joined_at).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Back Button */}
      {backLink}

      {/* Rider Profile Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-lg font-bold text-[var(--foreground)]">
            {rider.avatar ?? getInitials(rider.name)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)]">{rider.name}</h1>
            <div className="mt-1 flex items-center gap-3">
              <StatusBadge status={rider.status} />
              <span className="text-[12px] text-[var(--muted-foreground)]">{rider.id}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 self-start">
          {rider.status !== "available" && (
            <button
              onClick={() => void handleSetStatus("available")}
              className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-[13px] font-medium text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              Set Available
            </button>
          )}
          {rider.status !== "offline" && (
            <button
              onClick={() => void handleSetStatus("offline")}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors"
            >
              <X className="h-4 w-4" />
              Set Offline
            </button>
          )}
          {rider.status === "available" && (
            <button
              onClick={handleAssignOrder}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
            >
              <UserPlus className="h-4 w-4" />
              Assign Order
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-medium text-[var(--muted-foreground)]">Today&apos;s Deliveries</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">{rider.today_deliveries}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--muted)]">
              <Bike className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-medium text-[var(--muted-foreground)]">Completed Deliveries</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">{rider.completed_deliveries}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <PackageCheck className="h-[18px] w-[18px] text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-medium text-[var(--muted-foreground)]">Avg. Delivery Time</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">{rider.average_delivery_time} min</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Clock className="h-[18px] w-[18px] text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-medium text-[var(--muted-foreground)]">Rating</p>
              <div className="mt-1 flex items-center gap-1.5">
                <p className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{rider.rating}</p>
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
              </div>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Star className="h-[18px] w-[18px] text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left Column - Profile + Current Order + History */}
        <div className="xl:col-span-2 space-y-6">
          {/* Profile Info */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                Profile Information
              </h2>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]">
                    <Phone className="h-4 w-4 text-[var(--foreground)]" />
                  </div>
                  <div>
                    <p className="text-[12px] text-[var(--muted-foreground)]">Phone</p>
                    <p className="text-[13px] font-medium text-[var(--foreground)]">{rider.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]">
                    <Mail className="h-4 w-4 text-[var(--foreground)]" />
                  </div>
                  <div>
                    <p className="text-[12px] text-[var(--muted-foreground)]">Email</p>
                    <p className="text-[13px] font-medium text-[var(--foreground)]">{rider.email ?? "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]">
                    <MapPin className="h-4 w-4 text-[var(--foreground)]" />
                  </div>
                  <div>
                    <p className="text-[12px] text-[var(--muted-foreground)]">Location</p>
                    <p className="text-[13px] font-medium text-[var(--foreground)]">{rider.location_address ?? "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]">
                    <Calendar className="h-4 w-4 text-[var(--foreground)]" />
                  </div>
                  <div>
                    <p className="text-[12px] text-[var(--muted-foreground)]">Joined</p>
                    <p className="text-[13px] font-medium text-[var(--foreground)]">{joinedDate}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Current Orders */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                Current Orders ({activeDeliveries.length})
              </h2>
            </div>
            <div className="px-5 py-4">
              {activeDeliveries.length > 0 ? (
                <div className="space-y-3">
                  {activeDeliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                        <Bike className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[var(--foreground)]">
                          {delivery.order_id}
                        </p>
                        <p className="text-[11px] text-[var(--muted-foreground)]">
                          {deliveryStatusLabel(delivery.status)}
                        </p>
                      </div>
                      <Link
                        href={`/admin/orders/${delivery.order_id}`}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
                      >
                        View Order
                        <Navigation className="h-3 w-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8">
                  <Activity className="h-10 w-10 text-[var(--muted-foreground)] opacity-40" />
                  <p className="text-[13px] text-[var(--muted-foreground)]">
                    No active orders. Rider is idle.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Delivery History */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                Delivery History ({deliveryHistory.length})
              </h2>
            </div>
            <div className="px-5 py-4">
              {deliveryHistory.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8">
                  <PackageCheck className="h-10 w-10 text-[var(--muted-foreground)] opacity-40" />
                  <p className="text-[13px] text-[var(--muted-foreground)]">
                    No deliveries for this rider yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {deliveryHistory.slice(0, 10).map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/orders/${d.order_id}`}
                          className="text-[13px] font-semibold text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
                        >
                          {d.order_id}
                        </Link>
                        <p className="mt-1 flex items-center gap-2 text-[11px] text-[var(--muted-foreground)] truncate">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium",
                              deliveryStatusTone(d.status)
                            )}
                          >
                            {deliveryStatusLabel(d.status)}
                          </span>
                          {d.delivery_location ?? d.pickup_location ?? `Order ${d.order_id}`}
                        </p>
                      </div>
                      <p className="shrink-0 text-[11px] text-[var(--muted-foreground)]">
                        {getTimeAgo(d.delivered_at ?? d.failed_at ?? d.created_at)}
                      </p>
                    </div>
                  ))}
                  {deliveryHistory.length > 10 && (
                    <p className="text-center text-[12px] text-[var(--muted-foreground)] pt-1">
                      +{deliveryHistory.length - 10} more deliveries
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Location Map */}
        <div className="space-y-6">
          {/* Map Placeholder */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <div className="px-5 py-4">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                Current Location
              </h2>
              <p className="text-[12px] text-[var(--muted-foreground)]">
                {rider.location_address ?? "Location not set"}
              </p>
            </div>
            <div className="relative h-[260px] bg-[var(--muted)] mx-4 mb-4 rounded-lg overflow-hidden">
              {/* Grid lines */}
              <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path
                      d="M 40 0 L 0 0 0 40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.5"
                      className="text-[var(--border)]"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                <line x1="10%" y1="50%" x2="90%" y2="50%" stroke="currentColor" strokeWidth="2" className="text-[var(--border)]" opacity="0.8" />
                <line x1="50%" y1="10%" x2="50%" y2="90%" stroke="currentColor" strokeWidth="2" className="text-[var(--border)]" opacity="0.8" />
                <line x1="25%" y1="25%" x2="75%" y2="75%" stroke="currentColor" strokeWidth="1" className="text-[var(--border)]" opacity="0.5" />
                <line x1="75%" y1="25%" x2="25%" y2="75%" stroke="currentColor" strokeWidth="1" className="text-[var(--border)]" opacity="0.5" />
              </svg>

              {/* Restaurant marker */}
              <div
                className="absolute flex items-center gap-1.5"
                style={{ left: "45%", top: "42%" }}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--foreground)] shadow-lg">
                  <MapPin className="h-3.5 w-3.5 text-[var(--background)]" />
                </div>
                <span className="rounded-md bg-[var(--foreground)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--background)] shadow-lg whitespace-nowrap">
                  Restaurant
                </span>
              </div>

              {/* Rider marker */}
              <div
                className="absolute"
                style={{ left: "60%", top: "35%" }}
              >
                <div className="relative">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full shadow-lg",
                      rider.status === "available"
                        ? "bg-green-500"
                        : rider.status === "busy"
                        ? "bg-amber-500"
                        : "bg-gray-400"
                    )}
                  >
                    <Bike className="h-4 w-4 text-white" />
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    {rider.status !== "offline" && (
                      <>
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 bg-green-400" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                      </>
                    )}
                  </span>
                </div>
                <span className={cn(
                  "absolute -bottom-5 left-1/2 -translate-x-1/2 rounded-md px-1.5 py-0.5 text-[9px] font-semibold shadow-lg whitespace-nowrap",
                  rider.status === "available"
                    ? "bg-green-500 text-white"
                    : rider.status === "busy"
                    ? "bg-amber-500 text-white"
                    : "bg-gray-400 text-white"
                )}>
                  {rider.name.split(" ")[0]}
                </span>
              </div>

              {/* Route line from restaurant to rider */}
              <svg className="absolute inset-0 h-full w-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <line
                  x1="47%"
                  y1="45%"
                  x2="62%"
                  y2="38%"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="6 3"
                  className="text-[var(--primary)]"
                  opacity="0.6"
                />
              </svg>

              {/* Legend */}
              <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-sm px-3 py-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-[10px] font-medium text-[var(--foreground)]">Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-medium text-[var(--foreground)]">Busy</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-gray-400" />
                  <span className="text-[10px] font-medium text-[var(--foreground)]">Offline</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                Quick Actions
              </h2>
            </div>
            <div className="px-5 py-4 space-y-2">
              {rider.status === "available" && (
                <button
                  onClick={handleAssignOrder}
                  className="w-full inline-flex items-center gap-2.5 rounded-lg border border-[var(--border)] px-3 py-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
                >
                  <UserPlus className="h-4 w-4 text-[var(--muted-foreground)]" />
                  Assign Order
                </button>
              )}
              {rider.status !== "available" && (
                <button
                  onClick={() => void handleSetStatus("available")}
                  className="w-full inline-flex items-center gap-2.5 rounded-lg border border-green-200 px-3 py-2.5 text-[13px] font-medium text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20 transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  Set Available
                </button>
              )}
              {rider.status !== "offline" && (
                <button
                  onClick={() => void handleSetStatus("offline")}
                  className="w-full inline-flex items-center gap-2.5 rounded-lg border border-red-200 px-3 py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Set Offline
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}