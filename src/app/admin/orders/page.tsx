"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Eye,
  RefreshCw,
  XCircle,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingState from "@/components/ui/LoadingState";
import { formatNaira, cn, getTimeAgo } from "@/lib/utils";
import { showToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/api/errors";
import { getOrders, updateOrderStatus } from "@/lib/api/orders";
import {
  getNextOrderStatus,
  canCancelOrder,
} from "@/lib/order-status";
import type { BackendOrderStatus, OrderRecord, PageResult } from "@/lib/types";

type FilterValue = "all" | BackendOrderStatus;

const filterTabs: { label: string; value: FilterValue }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Preparing", value: "preparing" },
  { label: "Ready", value: "ready" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const PAGE_SIZE = 8;
// When a client-side search/status filter is active, fetch up to this many of
// the newest orders (the backend's max page size) and filter those locally. The
// backend order list endpoint has no search/status param today, so an unbounded
// "fetch everything" is deliberately avoided; 100 is the backend's hard cap and
// is a small, bounded request.
const MAX_FILTER_ROWS = 100;

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverOrders, setServerOrders] = useState<PageResult<OrderRecord> | null>(null);
  const [filteredOrders, setFilteredOrders] = useState<OrderRecord[]>([]);

  const isFiltered = activeFilter !== "all" || searchQuery.trim() !== "";

  const loadOrders = useCallback(async () => {
    if (isFiltered) {
      const q = searchQuery.trim().toLowerCase();
      const data = await getOrders({ page: 1, page_size: MAX_FILTER_ROWS });
      const rows = data.items.filter((o) => {
        const matchesStatus = activeFilter === "all" || o.status === activeFilter;
        const matchesSearch =
          !q ||
          o.order_number.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          o.items.some((item) =>
            item.name_snapshot.toLowerCase().includes(q)
          );
        return matchesStatus && matchesSearch;
      });
      setFilteredOrders(rows);
      setServerOrders(null);
    } else {
      const data = await getOrders({ page: currentPage, page_size: PAGE_SIZE });
      setServerOrders(data);
      setFilteredOrders([]);
    }
    setError(null);
  }, [isFiltered, activeFilter, searchQuery, currentPage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOrders();
  }, [loadOrders]);

  const refresh = () => {
    setLoading(true);
    setError(null);
    void loadOrders();
  };

  const rows = useMemo(() => {
    if (isFiltered) {
      const from = (currentPage - 1) * PAGE_SIZE;
      return filteredOrders.slice(from, from + PAGE_SIZE);
    }
    return serverOrders?.items ?? [];
  }, [isFiltered, filteredOrders, serverOrders, currentPage]);

  const totalCount = isFiltered ? filteredOrders.length : (serverOrders?.total ?? 0);
  const totalPages = isFiltered
    ? Math.ceil(filteredOrders.length / PAGE_SIZE)
    : (serverOrders?.pages ?? 0);

  const handleFilterChange = (filter: FilterValue) => {
    setActiveFilter(filter);
    setCurrentPage(1);
    setOpenMenuId(null);
  };

  const handleStatusUpdate = async (orderId: string, status: BackendOrderStatus) => {
    setOpenMenuId(null);
    try {
      await updateOrderStatus(orderId, status);
      showToast("success", `Order status updated to ${status.replace(/_/g, " ")}`);
      void loadOrders();
    } catch (err) {
      showToast("error", getErrorMessage(err));
    }
  };

  const openFor = (order: OrderRecord) => {
    const next = getNextOrderStatus(order.status);
    const canCancel = canCancelOrder(order.status);
    return { next, canCancel };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Orders</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
            Manage incoming orders and deliveries.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity self-start">
          <Plus className="h-4 w-4" />
          Create Order
        </button>
      </div>

      {/* Search + Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Search orders by ID, customer, or item..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] pl-9 pr-4 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleFilterChange(tab.value)}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
                activeFilter === tab.value
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && !rows.length ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <LoadingState />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] py-16">
          <p className="text-[13px] text-[var(--muted-foreground)]">{error}</p>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] py-16">
          <Package className="h-10 w-10 text-[var(--muted-foreground)] opacity-40" />
          <p className="text-[13px] text-[var(--muted-foreground)]">
            No orders found
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Rider
                    </th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-5 py-3 text-right text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((order) => {
                    const { next, canCancel } = openFor(order);
                    return (
                      <tr
                        key={order.id}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--accent)]/50 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <p className="text-[13px] font-medium text-[var(--foreground)]">
                            {order.order_number}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-[13px] text-[var(--foreground)]">
                            {order.customer_name}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-[13px] text-[var(--foreground)]">
                            {order.items.length} item{order.items.length > 1 ? "s" : ""}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-[13px] font-medium text-[var(--foreground)]">
                            {formatNaira(order.total)}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-[13px] text-[var(--foreground)]">
                            <span className="text-[var(--muted-foreground)]">
                              Unassigned
                            </span>
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-[12px] text-[var(--muted-foreground)]">
                            {getTimeAgo(order.created_at)}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="relative inline-block">
                            <button
                              onClick={() =>
                                setOpenMenuId(openMenuId === order.id ? null : order.id)
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {openMenuId === order.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setOpenMenuId(null)}
                                />
                                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg py-1">
                                  <Link
                                    href={`/admin/orders/${order.id}`}
                                    className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
                                    onClick={() => setOpenMenuId(null)}
                                  >
                                    <Eye className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                                    View Order
                                  </Link>
                                  {next && (
                                    <button
                                      className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
                                      onClick={() => handleStatusUpdate(order.id, next)}
                                    >
                                      <RefreshCw className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                                      Update to {next.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                                    </button>
                                  )}
                                  {canCancel && (
                                    <>
                                      <div className="my-1 border-t border-[var(--border)]" />
                                      <button
                                        className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        onClick={() => handleStatusUpdate(order.id, "cancelled")}
                                      >
                                        <XCircle className="h-3.5 w-3.5" />
                                        Cancel Order
                                      </button>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
                <p className="text-[12px] text-[var(--muted-foreground)]">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                  {Math.min(currentPage * PAGE_SIZE, totalCount)} of{" "}
                  {totalCount} orders
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
            {rows.map((order) => {
              const { canCancel } = openFor(order);
              return (
                <div
                  key={order.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[13px] font-semibold text-[var(--foreground)]">
                        {order.order_number}
                      </p>
                      <p className="text-[12px] text-[var(--muted-foreground)]">
                        {order.customer_name}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[var(--muted-foreground)]">
                      {order.items.length} item{order.items.length > 1 ? "s" : ""}
                    </span>
                    <span className="font-medium text-[var(--foreground)]">
                      {formatNaira(order.total)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[var(--muted-foreground)]">Unassigned</span>
                    <span className="text-[var(--muted-foreground)]">
                      {getTimeAgo(order.created_at)}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Link>
                    {canCancel && (
                      <button
                        onClick={() => handleStatusUpdate(order.id, "cancelled")}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-[12px] font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

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