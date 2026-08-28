"use client";

import { useState } from "react";
import {
  ShoppingBag,
  Clock,
  Bike,
  DollarSign,
  Plus,
  ArrowRight,
  Eye,
} from "lucide-react";
import Link from "next/link";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import DispatchMap from "@/components/dashboard/DispatchMap";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import CreateOrderModal from "@/components/orders/CreateOrderModal";
import { mockDailySummary, mockOrders } from "@/lib/mock-data";
import { formatNaira, getGreeting, getTimeAgo } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { showToast } from "@/components/ui/Toast";

export default function DashboardPage() {
  const { orders } = useApp();
  const recentOrders = orders.slice(0, 5);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);

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
        <button
          onClick={() => setCreateOrderOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity self-start"
        >
          <Plus className="h-4 w-4" />
          Create Order
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Orders Today"
          value={mockDailySummary.ordersToday}
          icon={ShoppingBag}
          trend={{
            value: mockDailySummary.ordersChange,
            label: "vs yesterday",
            positive: true,
          }}
        />
        <StatCard
          title="On-Time Delivery"
          value={`${mockDailySummary.onTimeDelivery}%`}
          icon={Clock}
          trend={{
            value: mockDailySummary.deliveryChange,
            label: "vs last week",
            positive: true,
          }}
        />
        <StatCard
          title="Active Riders"
          value={`${mockDailySummary.activeRiders} / ${mockDailySummary.totalRiders}`}
          subtitle={`${mockDailySummary.ridersOnlineChange} more online today`}
          icon={Bike}
        />
        <StatCard
          title="Gross Sales"
          value={formatNaira(mockDailySummary.grossSales)}
          icon={DollarSign}
          trend={{
            value: mockDailySummary.salesChange,
            label: "vs last week",
            positive: true,
          }}
        />
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
                    <p className="text-[13px] font-medium text-[var(--foreground)]">{order.id}</p>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      {order.items.length} item{order.items.length > 1 ? "s" : ""}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-[13px] text-[var(--foreground)]">{order.customerName}</p>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-[13px] text-[var(--foreground)]">
                      {order.riderName || (
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
                      {getTimeAgo(order.createdAt)}
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
                  <p className="text-[13px] font-medium text-[var(--foreground)]">{order.id}</p>
                  <p className="text-[12px] text-[var(--muted-foreground)]">{order.customerName}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[12px] text-[var(--muted-foreground)]">
                  {order.riderName || "Unassigned"}
                </p>
                <p className="text-[13px] font-medium text-[var(--foreground)]">
                  {formatNaira(order.total)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
      {/* Create Order Modal */}
      <CreateOrderModal
        open={createOrderOpen}
        onClose={() => setCreateOrderOpen(false)}
        onOrderCreated={() => {
          showToast("success", "Order created successfully");
        }}
      />
    </div>
  );
}
