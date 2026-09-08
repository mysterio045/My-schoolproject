"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight, MapPin, LogOut } from "lucide-react";
import { activeOrders } from "@/lib/mock-data";
import type { Order } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import BottomNav from "@/components/BottomNav";
import { formatCurrency, formatDistance } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { updateRiderAvailability } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const { rider, logout, refreshProfile } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!rider) {
    router.push("/login");
    return null;
  }

  const isOnline = rider.status === "available";

  const handleToggleOnline = async () => {
    setIsUpdating(true);
    try {
      const newStatus = isOnline ? "offline" : "available";
      await updateRiderAvailability({ status: newStatus });
      await refreshProfile();
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const currentDelivery = activeOrders.find(
    (o) => o.status === "ready_for_pickup" || o.status === "picked_up"
  );
  const nextOrders = activeOrders.filter(
    (o) => o.id !== currentDelivery?.id
  ).slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0c13] pb-20">
      <div className="bg-white dark:bg-[#0f1117] px-5 pt-12 pb-5 border-b border-gray-100 dark:border-[#2a2d37]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Good morning,
            </p>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {rider.first_name} {rider.last_name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {isOnline ? "Ready to deliver great food today." : "You are offline."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="relative w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 dark:bg-[#1a1d27] hover:bg-gray-100 dark:hover:bg-[#22252f] transition-colors"
              aria-label="Notifications"
            >
              <Bell size={20} className="text-gray-600 dark:text-gray-400" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button
              onClick={handleLogout}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 dark:bg-[#1a1d27] hover:bg-gray-100 dark:hover:bg-[#22252f] transition-colors"
              aria-label="Logout"
            >
              <LogOut size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-5">
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2d37] shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  isOnline ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                You are {isOnline ? "Online" : "Offline"}
              </span>
            </div>
            <button
              onClick={handleToggleOnline}
              disabled={isUpdating}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-[#1a1d27] ${
                isOnline ? "bg-green-600" : "bg-gray-300 dark:bg-gray-600"
              } ${isUpdating ? "opacity-60 cursor-not-allowed" : ""}`}
              role="switch"
              aria-checked={isOnline}
              aria-label={isOnline ? "Go offline" : "Go online"}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isOnline ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-[#1a1d27] rounded-xl p-3.5 border border-gray-100 dark:border-[#2a2d37] shadow-sm">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {rider.today_deliveries}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Today&apos;s Deliveries</p>
          </div>
          <div className="bg-white dark:bg-[#1a1d27] rounded-xl p-3.5 border border-gray-100 dark:border-[#2a2d37] shadow-sm">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {rider.completed_deliveries}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total Deliveries</p>
          </div>
          <div className="bg-white dark:bg-[#1a1d27] rounded-xl p-3.5 border border-gray-100 dark:border-[#2a2d37] shadow-sm">
            <div className="flex items-center gap-1.5">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {Number(rider.rating)}
              </p>
              <span className="text-amber-500 text-sm">&#9733;</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Rider Rating</p>
          </div>
          <div className="bg-white dark:bg-[#1a1d27] rounded-xl p-3.5 border border-gray-100 dark:border-[#2a2d37] shadow-sm">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {rider.average_delivery_time || 0}m
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Avg. Delivery Time</p>
          </div>
        </div>

        {currentDelivery && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Current Delivery
              </h2>
              <Link
                href={`/orders/${currentDelivery.id}`}
                className="text-sm text-green-600 dark:text-green-400 font-medium hover:text-green-700 dark:hover:text-green-300"
              >
                See details
              </Link>
            </div>
            <Link
              href={`/orders/${currentDelivery.id}`}
              className="block bg-white dark:bg-[#1a1d27] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2d37] shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">
                  #{currentDelivery.id}
                </span>
                <StatusBadge status={currentDelivery.status} />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {currentDelivery.restaurant.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {currentDelivery.restaurant.address}
              </p>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-[#2a2d37]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Pickup {formatDistance(currentDelivery.pickupDistance)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Drop-off {formatDistance(currentDelivery.dropoffDistance)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Deliver to</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                    {currentDelivery.customer.firstName} {currentDelivery.customer.lastName}
                  </p>
                </div>
                <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
              </div>
              <Link
                href={`/orders/${currentDelivery.id}/navigation`}
                className="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                <MapPin size={16} />
                Navigate to destination
              </Link>
            </Link>
          </div>
        )}

        {nextOrders.length > 0 && (
          <div className="pb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Next Orders
              </h2>
              <Link
                href="/orders"
                className="text-sm text-green-600 dark:text-green-400 font-medium hover:text-green-700 dark:hover:text-green-300"
              >
                See all
              </Link>
            </div>
            <div className="space-y-3">
              {nextOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
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
      className="block bg-white dark:bg-[#1a1d27] rounded-xl p-4 border border-gray-100 dark:border-[#2a2d37] shadow-sm hover:shadow-md transition-shadow"
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
        {order.restaurant.address}
      </p>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Pickup {formatDistance(order.pickupDistance)}
            </span>
          </div>
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
    </Link>
  );
}
