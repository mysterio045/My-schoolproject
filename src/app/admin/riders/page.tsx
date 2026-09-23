"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Eye,
  Bike,
  Users,
  CheckCircle,
  XCircle,
  Star,
  MapPin,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingState from "@/components/ui/LoadingState";
import { cn, getInitials } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api/errors";
import { getRiders, updateRiderStatus } from "@/lib/api/riders";
import { showToast } from "@/components/ui/Toast";
import type { PageResult, RiderRecord, RiderStatus } from "@/lib/types";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { useRealtimeEvents, useFallbackPolling } from "@/lib/realtime/hooks";

const ITEMS_PER_PAGE = 8;
// While searching, fetch a small bounded set (the backend's max page size) and
// page through it locally; the backend `search` param matches rider name/phone/email.
const MAX_FILTER_ROWS = 100;

interface RiderStats {
  total: number;
  available: number;
  busy: number;
  offline: number;
}

function computeStats(res: PageResult<RiderRecord>): RiderStats {
  const stats: RiderStats = { total: res.total, available: 0, busy: 0, offline: 0 };
  for (const rider of res.items) {
    if (rider.status === "available") stats.available += 1;
    else if (rider.status === "busy") stats.busy += 1;
    else stats.offline += 1;
  }
  return stats;
}

// The backend has no live "active order" count on riders; their real `status`
// is the authoritative signal that a rider is engaged on a delivery.
function currentOrderLabel(rider: RiderRecord): string {
  return rider.status === "busy" ? "In delivery" : "No active orders";
}

function distanceLabel(rider: RiderRecord): string {
  return rider.distance_from_restaurant != null
    ? `${rider.distance_from_restaurant} km`
    : "—";
}

function locationLabel(rider: RiderRecord): string {
  return rider.location_address ?? "—";
}

export default function RidersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverRiders, setServerRiders] =
    useState<PageResult<RiderRecord> | null>(null);
  const [filteredRiders, setFilteredRiders] = useState<RiderRecord[]>([]);
  const [statsResult, setStatsResult] = useState<RiderStats | null>(null);

  const isSearching = searchQuery.trim() !== "";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, listRes] = await Promise.all([
        getRiders({ page: 1, page_size: MAX_FILTER_ROWS }),
        isSearching
          ? getRiders({
              page: 1,
              page_size: MAX_FILTER_ROWS,
              search: searchQuery.trim(),
            })
          : getRiders({ page: currentPage, page_size: ITEMS_PER_PAGE }),
      ]);
      setStatsResult(computeStats(statsRes));
      if (isSearching) {
        setFilteredRiders(listRes.items);
        setServerRiders(null);
      } else {
        setServerRiders(listRes);
        setFilteredRiders([]);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isSearching, searchQuery, currentPage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Live rider list: refresh when a rider changes, gets assigned a delivery,
  // or their delivery moves. Coalesced since dispatch fires several at once.
  useRealtimeEvents(
    [
      REALTIME_EVENTS.RIDER_UPDATED,
      REALTIME_EVENTS.DELIVERY_UPDATED,
      REALTIME_EVENTS.DISPATCH_ASSIGNED,
      REALTIME_EVENTS.CONNECTED,
    ],
    () => {
      void load();
    },
    { debounceMs: 400 }
  );

  // Fallback polling while the socket is disconnected.
  useFallbackPolling(
    30_000,
    () => {
      void load();
    },
    []
  );

  const rows = useMemo(() => {
    if (isSearching) {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      return filteredRiders.slice(from, from + ITEMS_PER_PAGE);
    }
    return serverRiders?.items ?? [];
  }, [isSearching, filteredRiders, serverRiders, currentPage]);

  const totalCount = isSearching
    ? filteredRiders.length
    : (serverRiders?.total ?? 0);
  const totalPages = isSearching
    ? Math.ceil(filteredRiders.length / ITEMS_PER_PAGE)
    : (serverRiders?.pages ?? 0);

  const handleSetStatus = async (
    riderId: string,
    status: RiderStatus,
    riderName: string
  ) => {
    setOpenMenuId(null);
    try {
      await updateRiderStatus(riderId, status);
      showToast("success", `${riderName} is now ${status}`);
      void load();
    } catch (err) {
      showToast("error", getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Riders</h1>
        <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
          Manage your delivery team and availability.
        </p>
      </div>

      {loading && !rows.length ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <LoadingState />
        </div>
      ) : error && rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] py-16">
          <p className="text-[13px] text-[var(--muted-foreground)]">{error}</p>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-medium text-[var(--muted-foreground)]">Total Riders</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">{statsResult?.total ?? "—"}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--muted)]">
                  <Users className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-medium text-[var(--muted-foreground)]">Available</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-green-600 dark:text-green-400">{statsResult?.available ?? "—"}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-[18px] w-[18px] text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-medium text-[var(--muted-foreground)]">Busy</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{statsResult?.busy ?? "—"}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Bike className="h-[18px] w-[18px] text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-medium text-[var(--muted-foreground)]">Offline</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-gray-500 dark:text-gray-400">{statsResult?.offline ?? "—"}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                  <XCircle className="h-[18px] w-[18px] text-gray-500 dark:text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
            <input
              type="text"
              placeholder="Search riders by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] pl-9 pr-4 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
            />
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Rider
                    </th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Current Order
                    </th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Distance
                    </th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Today&apos;s Deliveries
                    </th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-5 py-3 text-right text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Bike className="h-10 w-10 text-[var(--muted-foreground)] opacity-40" />
                          <p className="text-[13px] text-[var(--muted-foreground)]">No riders found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    rows.map((rider) => (
                      <tr
                        key={rider.id}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--accent)]/50 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]">
                              <span className="text-[12px] font-semibold text-[var(--foreground)]">
                                {rider.avatar ?? getInitials(rider.name)}
                              </span>
                            </div>
                            <div>
                              <p className="text-[13px] font-medium text-[var(--foreground)]">
                                {rider.name}
                              </p>
                              <p className="text-[11px] text-[var(--muted-foreground)]">{rider.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={rider.status} />
                        </td>
                        <td className="px-5 py-3">
                          {rider.status === "busy" ? (
                            <p className="text-[13px] text-[var(--foreground)]">
                              {currentOrderLabel(rider)}
                            </p>
                          ) : (
                            <span className="text-[12px] text-[var(--muted-foreground)]">{currentOrderLabel(rider)}</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-[var(--muted-foreground)] shrink-0" />
                            <p className="text-[13px] text-[var(--foreground)] truncate max-w-[140px]">
                              {locationLabel(rider)}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-[13px] text-[var(--foreground)]">
                            {distanceLabel(rider)}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-[13px] font-medium text-[var(--foreground)]">
                            {rider.today_deliveries}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                            <p className="text-[13px] font-medium text-[var(--foreground)]">{rider.rating}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="relative inline-block">
                            <button
                              onClick={() =>
                                setOpenMenuId(openMenuId === rider.id ? null : rider.id)
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {openMenuId === rider.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setOpenMenuId(null)}
                                />
                                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg py-1">
                                  <Link
                                    href={`/admin/riders/${rider.id}`}
                                    className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
                                    onClick={() => setOpenMenuId(null)}
                                  >
                                    <Eye className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                                    View Details
                                  </Link>
                                  {rider.status !== "available" && (
                                    <button
                                      className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
                                      onClick={() => void handleSetStatus(rider.id, "available", rider.name)}
                                    >
                                      <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                      Set Available
                                    </button>
                                  )}
                                  {rider.status !== "offline" && (
                                    <button
                                      className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                      onClick={() => void handleSetStatus(rider.id, "offline", rider.name)}
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                      Set Offline
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
                <p className="text-[12px] text-[var(--muted-foreground)]">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                  {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of{" "}
                  {totalCount} riders
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-md text-[12px] font-medium transition-colors",
                        currentPage === page
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                          : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                      )}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] py-12">
                <Bike className="h-10 w-10 text-[var(--muted-foreground)] opacity-40" />
                <p className="text-[13px] text-[var(--muted-foreground)]">No riders found</p>
              </div>
            ) : (
              rows.map((rider) => (
                <div
                  key={rider.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)]">
                        <span className="text-[12px] font-semibold text-[var(--foreground)]">
                          {rider.avatar ?? getInitials(rider.name)}
                        </span>
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[var(--foreground)]">
                          {rider.name}
                        </p>
                        <p className="text-[11px] text-[var(--muted-foreground)]">{rider.id}</p>
                      </div>
                    </div>
                    <StatusBadge status={rider.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[12px]">
                    <div>
                      <p className="text-[var(--muted-foreground)]">Location</p>
                      <p className="font-medium text-[var(--foreground)] truncate">{locationLabel(rider)}</p>
                    </div>
                    <div>
                      <p className="text-[var(--muted-foreground)]">Distance</p>
                      <p className="font-medium text-[var(--foreground)]">{distanceLabel(rider)}</p>
                    </div>
                    <div>
                      <p className="text-[var(--muted-foreground)]">Today&apos;s Deliveries</p>
                      <p className="font-medium text-[var(--foreground)]">{rider.today_deliveries}</p>
                    </div>
                    <div>
                      <p className="text-[var(--muted-foreground)]">Rating</p>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        <p className="font-medium text-[var(--foreground)]">{rider.rating}</p>
                      </div>
                    </div>
                  </div>

                  {rider.status === "busy" && (
                    <p className="text-[12px] text-[var(--muted-foreground)]">
                      Active: <span className="text-[var(--foreground)]">In delivery</span>
                    </p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/admin/riders/${rider.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Details
                    </Link>
                    {rider.status !== "available" && (
                      <button
                        onClick={() => void handleSetStatus(rider.id, "available", rider.name)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-green-200 px-3 py-2 text-[12px] font-medium text-green-600 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20 transition-colors"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Available
                      </button>
                    )}
                    {rider.status !== "offline" && (
                      <button
                        onClick={() => void handleSetStatus(rider.id, "offline", rider.name)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-[12px] font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Offline
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
                <p className="text-[12px] text-[var(--muted-foreground)]">
                  {currentPage} / {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}