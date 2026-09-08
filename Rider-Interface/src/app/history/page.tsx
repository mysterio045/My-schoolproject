"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { historyOrders } from "@/lib/mock-data";
import type { Order } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import BottomNav from "@/components/BottomNav";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";

type Filter = "today" | "week" | "all";

const filters: { key: Filter; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "all", label: "All" },
];

export default function HistoryPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>("all");

  const filteredOrders = historyOrders.filter((order) => {
    if (activeFilter === "all") return true;
    const date = new Date(order.deliveredAt || order.assignedAt);
    const now = new Date();
    if (activeFilter === "today") {
      return date.toDateString() === now.toDateString();
    }
    if (activeFilter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return date >= weekAgo;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0c13] pb-20">
      <div className="bg-white dark:bg-[#0f1117] px-5 pt-12 pb-4 border-b border-gray-100 dark:border-[#2a2d37]">
        <div className="flex items-center gap-3">
          <Link
            href="/home"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-[#1a1d27] hover:bg-gray-100 dark:hover:bg-[#22252f] transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Delivery History</h1>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0f1117] border-b border-gray-100 dark:border-[#2a2d37] px-5">
        <div className="flex gap-2 py-3">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeFilter === filter.key
                  ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4">
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2d37] shadow-sm mb-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {filteredOrders.filter((o) => o.status === "delivered").length}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Completed</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(
                  filteredOrders
                    .filter((o) => o.status === "delivered")
                    .reduce((sum, o) => sum + o.deliveryFee, 0)
                )}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Total Earned</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {filteredOrders.filter((o) => o.status === "cancelled").length}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Cancelled</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-gray-400 dark:text-gray-500">No delivery history found</p>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {filteredOrders.map((order) => (
              <HistoryCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function HistoryCard({ order }: { order: Order }) {
  const time = order.deliveredAt || order.assignedAt;
  const date = formatDate(time);
  const timeStr = formatTime(time);

  return (
    <Link
      href={`/orders/${order.id}`}
      className="block bg-white dark:bg-[#1a1d27] rounded-xl p-4 border border-gray-100 dark:border-[#2a2d37] shadow-sm"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">
          #{order.id}
        </span>
        <StatusBadge status={order.status} />
      </div>

      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {order.restaurant.name}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
        {order.customer.firstName} {order.customer.lastName}
      </p>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-[#2a2d37]">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {date} &bull; {timeStr}
        </span>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {formatCurrency(order.deliveryFee)}
        </span>
      </div>
    </Link>
  );
}
