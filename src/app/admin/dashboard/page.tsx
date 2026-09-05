"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ShoppingBag,
  Clock,
  Bike,
  DollarSign,
  Plus,
  ArrowRight,
  Eye,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import DispatchMap from "@/components/dashboard/DispatchMap";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import CreateOrderModal from "@/components/orders/CreateOrderModal";
import { getDashboardSummary } from "@/lib/api/dashboard";
import { getErrorMessage } from "@/lib/api/errors";
import type { DashboardSummary } from "@/lib/types";
import { formatNaira, getGreeting, getTimeAgo } from "@/lib/utils";
import { showToast } from "@/components/ui/Toast";

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="h-3 w-24 rounded bg-[var(--muted)]" />
      <div className="mt-3 h-7 w-28 rounded bg-[var(--muted)]" />
      <div className="mt-2 h-3 w-20 rounded bg-[var(--muted)]" />
    </div>
  );
}

export default function DashboardPage() {
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getDashboardSummary();
      setSummary(data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const refresh = () => {
    setLoading(true);
    setError(null);
    void load();
    showToast("success", "Dashboard refreshed");
  };

  const totalRiders =
    (summary?.available_riders ?? 0) +
    (summary?.busy_riders ?? 0) +
    (summary?.offline_riders ?? 0);

  const recentOrders = summary?.recent_orders ?? [];
  const recentOrdersLoading = loading && !summary;
  const recentOrdersError = error;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">
            {getGreeting()}, Admin
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
            Here&apos;s what&apos;s happening with your restaurant today.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-[13px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setCreateOrderOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Create Order
          </button>
        </div>
      </div>

      {/* Error state */}
      {recentOrdersError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/60 dark:bg-red-900/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-[13px] font-medium text-red-600 dark:text-red-400">
              We couldn&apos;t load your dashboard data. {recentOrdersError}
            </p>
          </div>
          <button
            onClick={refresh}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading && !summary ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Orders Today"
              value={summary?.orders_today ?? 0}
              icon={ShoppingBag}
            />
            <StatCard
              title="Total Orders"
              value={summary?.total_orders ?? 0}
              icon={Clock}
            />
            <StatCard
              title="Active Riders"
              value={summary ? `${summary.available_riders} / ${totalRiders}` : "0 / 0"}
              subtitle={
                summary
                  ? `${summary.busy_riders} busy · ${summary.offline_riders} offline`
                  : undefined
              }
              icon={Bike}
            />
            <StatCard
              title="Gross Sales"
              value={formatNaira(summary?.total_revenue ?? 0)}
              icon={DollarSign}
            />
          </>
        )}
      </div>

      {/* Dispatch Map + Performance Chart */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <DispatchMap />
        </div>
        <div className="xl:col-span-2">
          <PerformanceChart />
        </div>
      </div>

      {/* Recent Orders */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Recent Orders</h2>
            <p className="text-[12px] text-[var(--muted-foreground)]">
              Manage and track incoming orders
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentOrdersLoading ? (
          <div className="space-y-2 p-5">
            <div className="h-10 rounded bg-[var(--muted)]" />
            <div className="h-10 rounded bg-[var(--muted)]" />
            <div className="h-10 rounded bg-[var(--muted)]" />
          </div>
        ) : recentOrdersError ? (
          <p className="px-5 py-8 text-center text-[13px] text-[var(--muted-foreground)]">
            Recent orders are unavailable right now.
          </p>
        ) : recentOrders.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-[var(--muted-foreground)]">
            No orders yet.
          </p>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
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
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Rider
                    </th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-5 py-3 text-right text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--accent)]/50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <p className="text-[13px] font-medium text-[var(--foreground)]">
                          {order.order_number}
                        </p>
                        <p className="text-[11px] text-[var(--muted-foreground)]">
                          #{order.id.slice(0, 8)}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-[13px] text-[var(--foreground)]">
                          {order.customer_name}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-[13px] text-[var(--foreground)]">
                          {order.rider_name || (
                            <span className="text-[var(--muted-foreground)]">Unassigned</span>
                          )}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-[13px] font-medium text-[var(--foreground)]">
                          {formatNaira(order.total)}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-[12px] text-[var(--muted-foreground)]">
                          {getTimeAgo(order.created_at)}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[var(--border)]">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="block px-5 py-3 hover:bg-[var(--accent)]/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-[var(--foreground)]">
                        {order.order_number}
                      </p>
                      <p className="text-[12px] text-[var(--muted-foreground)]">
                        {order.customer_name}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-[12px] text-[var(--muted-foreground)]">
                      {order.rider_name || "Unassigned"}
                    </p>
                    <p className="text-[13px] font-medium text-[var(--foreground)]">
                      {formatNaira(order.total)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
      {/* Create Order Modal */}
      <CreateOrderModal
        open={createOrderOpen}
        onClose={() => setCreateOrderOpen(false)}
        onOrderCreated={() => {
          showToast("success", "Order created successfully");
          refresh();
        }}
      />
    </div>
  );
}
