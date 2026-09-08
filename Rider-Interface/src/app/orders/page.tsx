"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { activeOrders, historyOrders } from "@/lib/mock-data";
import type { Order } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import BottomNav from "@/components/BottomNav";
import { formatDistance } from "@/lib/utils";

type Tab = "active" | "ready" | "history";

const tabs: { key: Tab; label: string; count: number }[] = [
  {
    key: "active",
    label: "Active",
    count: activeOrders.filter(
      (o) => o.status !== "ready_for_pickup" && o.status !== "delivered" && o.status !== "cancelled"
    ).length,
  },
  {
    key: "ready",
    label: "Ready",
    count: activeOrders.filter((o) => o.status === "ready_for_pickup").length,
  },
  {
    key: "history",
    label: "History",
    count: historyOrders.length,
  },
];

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<Tab>("active");

  const filteredOrders =
    activeTab === "active"
      ? activeOrders.filter(
          (o) =>
            o.status !== "ready_for_pickup" &&
            o.status !== "delivered" &&
            o.status !== "cancelled"
        )
      : activeTab === "ready"
      ? activeOrders.filter((o) => o.status === "ready_for_pickup")
      : historyOrders;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0c13] pb-20">
      <div className="bg-white dark:bg-[#0f1117] px-5 pt-12 pb-4 border-b border-gray-100 dark:border-[#2a2d37]">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">My Orders</h1>
      </div>

      <div className="bg-white dark:bg-[#0f1117] border-b border-gray-100 dark:border-[#2a2d37] px-5">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-green-600 text-green-700 dark:text-green-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key
                      ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-gray-400 dark:text-gray-500">No orders to show</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  return (
    <Link
      href={`/orders/${order.id}`}
      className="block bg-white dark:bg-[#1a1d27] rounded-xl p-4 border border-gray-100 dark:border-[#2a2d37] shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">
          #{order.id}
        </span>
        <StatusBadge status={order.status} />
      </div>

      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900/50 rounded-md flex items-center justify-center flex-shrink-0">
          <span className="text-xs">&#127860;</span>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {order.restaurant.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {order.restaurant.address}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-[#2a2d37]">
        <div className="flex items-center gap-4">
          {order.pickupDistance > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Pickup {formatDistance(order.pickupDistance)}
              </span>
            </div>
          )}
          {order.dropoffDistance > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Drop-off {formatDistance(order.dropoffDistance)}
              </span>
            </div>
          )}
        </div>
        <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
      </div>

      {(order.status === "delivered" || order.status === "cancelled") && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          {order.customer.firstName} {order.customer.lastName}
          {order.deliveredAt && ` \u2022 ${new Date(order.deliveredAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`}
        </p>
      )}
    </Link>
  );
}
