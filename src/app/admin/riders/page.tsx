"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Eye,
  Bike,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Star,
  MapPin,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 8;

export default function RidersPage() {
  const { riders, setRiders } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = riders.length;
    const available = riders.filter((r) => r.status === "available").length;
    const busy = riders.filter((r) => r.status === "busy").length;
    const offline = riders.filter((r) => r.status === "offline").length;
    return { total, available, busy, offline };
  }, [riders]);

  const filteredRiders = useMemo(() => {
    let result = riders;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.location.address.toLowerCase().includes(q)
      );
    }
    return result;
  }, [riders, searchQuery]);

  const totalPages = Math.ceil(filteredRiders.length / ITEMS_PER_PAGE);
  const paginatedRiders = filteredRiders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSetAvailable = (riderId: string) => {
    setRiders((prev) =>
      prev.map((r) =>
        r.id === riderId
          ? { ...r, status: "available" as const, currentOrderIds: [] }
          : r
      )
    );
    setOpenMenuId(null);
  };

  const handleSetOffline = (riderId: string) => {
    setRiders((prev) =>
      prev.map((r) =>
        r.id === riderId
          ? { ...r, status: "offline" as const, currentOrderIds: [] }
          : r
      )
    );
    setOpenMenuId(null);
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-medium text-[var(--muted-foreground)]">Total Riders</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">{stats.total}</p>
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
              <p className="mt-1 text-2xl font-bold tracking-tight text-green-600 dark:text-green-400">{stats.available}</p>
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
              <p className="mt-1 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{stats.busy}</p>
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
              <p className="mt-1 text-2xl font-bold tracking-tight text-gray-500 dark:text-gray-400">{stats.offline}</p>
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
          placeholder="Search riders by name, ID, or location..."
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
              {paginatedRiders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Bike className="h-10 w-10 text-[var(--muted-foreground)] opacity-40" />
                      <p className="text-[13px] text-[var(--muted-foreground)]">No riders found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRiders.map((rider) => (
                  <tr
                    key={rider.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--accent)]/50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]">
                          <span className="text-[12px] font-semibold text-[var(--foreground)]">
                            {rider.avatar}
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
                      {rider.currentOrderIds.length > 0 ? (
                        <p className="text-[13px] text-[var(--foreground)]">
                          {rider.currentOrderIds.length} order{rider.currentOrderIds.length !== 1 ? "s" : ""}
                        </p>
                      ) : (
                        <span className="text-[12px] text-[var(--muted-foreground)]">No active orders</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[var(--muted-foreground)] shrink-0" />
                        <p className="text-[13px] text-[var(--foreground)] truncate max-w-[140px]">
                          {rider.location.address}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-[13px] text-[var(--foreground)]">
                        {rider.distanceFromRestaurant} km
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-[13px] font-medium text-[var(--foreground)]">
                        {rider.todayDeliveries}
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
                                  onClick={() => handleSetAvailable(rider.id)}
                                >
                                  <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                  Set Available
                                </button>
                              )}
                              {rider.status !== "offline" && (
                                <button
                                  className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  onClick={() => handleSetOffline(rider.id)}
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
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredRiders.length)} of{" "}
              {filteredRiders.length} riders
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
        {paginatedRiders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] py-12">
            <Bike className="h-10 w-10 text-[var(--muted-foreground)] opacity-40" />
            <p className="text-[13px] text-[var(--muted-foreground)]">No riders found</p>
          </div>
        ) : (
          paginatedRiders.map((rider) => (
            <div
              key={rider.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)]">
                    <span className="text-[12px] font-semibold text-[var(--foreground)]">
                      {rider.avatar}
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
                  <p className="font-medium text-[var(--foreground)] truncate">{rider.location.address}</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">Distance</p>
                  <p className="font-medium text-[var(--foreground)]">{rider.distanceFromRestaurant} km</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">Today&apos;s Deliveries</p>
                  <p className="font-medium text-[var(--foreground)]">{rider.todayDeliveries}</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    <p className="font-medium text-[var(--foreground)]">{rider.rating}</p>
                  </div>
                </div>
              </div>

              {rider.currentOrderIds.length > 0 && (
                <p className="text-[12px] text-[var(--muted-foreground)]">
                  Active: <span className="text-[var(--foreground)]">
                    {rider.currentOrderIds.length} order{rider.currentOrderIds.length !== 1 ? "s" : ""}
                  </span>
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
                    onClick={() => handleSetAvailable(rider.id)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-green-200 px-3 py-2 text-[12px] font-medium text-green-600 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20 transition-colors"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Available
                  </button>
                )}
                {rider.status !== "offline" && (
                  <button
                    onClick={() => handleSetOffline(rider.id)}
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
    </div>
  );
}
