"use client";

import { useState, use } from "react";
import Link from "next/link";
import { ChevronLeft, Phone, Navigation, MoreHorizontal, Map } from "lucide-react";
import { activeOrders } from "@/lib/mock-data";
import type { DeliveryStatus } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import DeliveryProgress from "@/components/DeliveryProgress";
import BottomNav from "@/components/BottomNav";
import { formatCurrency } from "@/lib/utils";

export default function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const order = activeOrders.find((o) => o.id === id);

  const [orderStatus, setOrderStatus] = useState<DeliveryStatus>(
    order?.status ?? "assigned"
  );

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0c13] pb-20">
        <div className="bg-white dark:bg-[#0f1117] px-5 pt-12 pb-4 border-b border-gray-100 dark:border-[#2a2d37]">
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-[#1a1d27] hover:bg-gray-100 dark:hover:bg-[#22252f] transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
            </Link>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Order Not Found
            </h1>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-gray-400 dark:text-gray-500">This order could not be found.</p>
        </div>
      </div>
    );
  }

  const handleAction = () => {
    if (orderStatus === "ready_for_pickup") {
      setOrderStatus("picked_up");
    } else if (orderStatus === "picked_up") {
      setOrderStatus("delivered");
    }
  };

  const actionButton =
    orderStatus === "ready_for_pickup"
      ? { label: "Picked Up", nextLabel: "Confirm Pickup" }
      : orderStatus === "picked_up"
      ? { label: "Delivered", nextLabel: "Mark Delivered" }
      : null;

  const isPickedUp = orderStatus === "picked_up" || orderStatus === "delivered";
  const destination = isPickedUp
    ? { lat: order.customer.latitude, lng: order.customer.longitude, name: `${order.customer.firstName} ${order.customer.lastName}`, address: order.deliveryAddress }
    : { lat: order.restaurant.latitude, lng: order.restaurant.longitude, name: order.restaurant.name, address: order.restaurant.address };

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0c13] pb-32">
      <div className="bg-white dark:bg-[#0f1117] px-5 pt-12 pb-4 border-b border-gray-100 dark:border-[#2a2d37] sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-[#1a1d27] hover:bg-gray-100 dark:hover:bg-[#22252f] transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                #{order.id}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={orderStatus} size="md" />
            <button
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-[#1a1d27] hover:bg-gray-100 dark:hover:bg-[#22252f] transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-5">
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2d37] shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wider">
            Delivery Progress
          </h2>
          <DeliveryProgress
            currentStatus={orderStatus}
            orderPlacedAt={order.assignedAt}
            preparingAt={order.preparingAt}
            readyAt={order.readyAt}
            pickedUpAt={order.pickedUpAt}
            deliveredAt={order.deliveredAt}
          />
        </div>

        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl overflow-hidden border border-gray-100 dark:border-[#2a2d37] shadow-sm">
          <div className="bg-gray-200 dark:bg-[#22252f] h-40 flex items-center justify-center relative">
            <div className="absolute inset-0 opacity-20 dark:opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                backgroundSize: '24px 24px',
              }} />
            </div>
            <div className="relative flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
              <Map size={32} />
              <span className="text-xs font-medium">Map Preview</span>
            </div>
            <div className="absolute bottom-3 left-3 bg-white dark:bg-[#1a1d27] rounded-lg px-2.5 py-1.5 shadow-sm border border-gray-100 dark:border-[#2a2d37]">
              <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
              </span>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${isPickedUp ? "bg-blue-500" : "bg-green-500"}`} />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {isPickedUp ? "Drop-off Location" : "Pickup Location"}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {destination.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {destination.address}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2d37] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              Restaurant (Pickup)
            </h2>
          </div>
          <div className="mb-4">
            <p className="text-base font-medium text-gray-900 dark:text-gray-100">
              {order.restaurant.name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {order.restaurant.address}
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href={`tel:${order.restaurant.phone}`}
              className="flex-1 h-11 flex items-center justify-center gap-2 bg-gray-50 dark:bg-[#22252f] hover:bg-gray-100 dark:hover:bg-[#2a2d37] rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors border border-gray-200 dark:border-[#2a2d37]"
            >
              <Phone size={16} />
              Call
            </a>
            <Link
              href={`/orders/${order.id}/navigation`}
              className="flex-1 h-11 flex items-center justify-center gap-2 bg-gray-50 dark:bg-[#22252f] hover:bg-gray-100 dark:hover:bg-[#2a2d37] rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors border border-gray-200 dark:border-[#2a2d37]"
            >
              <Navigation size={16} />
              Navigate
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2d37] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              Customer (Drop-off)
            </h2>
          </div>
          <div className="mb-3">
            <p className="text-base font-medium text-gray-900 dark:text-gray-100">
              {order.customer.firstName} {order.customer.lastName}
            </p>
            <a
              href={`tel:${order.customer.phone}`}
              className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
            >
              {order.customer.phone}
            </a>
          </div>
          <div className="mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Delivery Address
            </p>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {order.deliveryAddress}
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href={`tel:${order.customer.phone}`}
              className="flex-1 h-11 flex items-center justify-center gap-2 bg-gray-50 dark:bg-[#22252f] hover:bg-gray-100 dark:hover:bg-[#2a2d37] rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors border border-gray-200 dark:border-[#2a2d37]"
            >
              <Phone size={16} />
              Call
            </a>
            <Link
              href={`/orders/${order.id}/navigation`}
              className="flex-1 h-11 flex items-center justify-center gap-2 bg-gray-50 dark:bg-[#22252f] hover:bg-gray-100 dark:hover:bg-[#2a2d37] rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors border border-gray-200 dark:border-[#2a2d37]"
            >
              <Navigation size={16} />
              Navigate
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2d37] shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wider">
            Order Items ({order.items.length})
          </h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {item.quantity}x {item.name}
                </span>
                <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#2a2d37] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Order Value</span>
              <span className="text-sm text-gray-900 dark:text-gray-100">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Delivery Fee</span>
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                {formatCurrency(order.deliveryFee)}
              </span>
            </div>
          </div>
        </div>

        {order.deliveryNotes && (
          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2d37] shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wider">
              Delivery Notes
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">{order.deliveryNotes}</p>
          </div>
        )}
      </div>

      {actionButton && orderStatus !== "delivered" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0f1117] border-t border-gray-200 dark:border-[#2a2d37] p-5 z-50 safe-area-pb">
          <div className="max-w-[430px] mx-auto flex gap-3">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-14 px-5 flex items-center justify-center gap-2 bg-gray-100 dark:bg-[#1a1d27] text-gray-700 dark:text-gray-300 font-semibold text-sm rounded-xl border border-gray-200 dark:border-[#2a2d37]"
            >
              <Navigation size={18} />
              Maps
            </a>
            <button
              onClick={handleAction}
              className="flex-1 h-14 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold text-base rounded-xl transition-colors"
            >
              {actionButton.nextLabel}
            </button>
          </div>
        </div>
      )}

      {orderStatus === "delivered" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0f1117] border-t border-gray-200 dark:border-[#2a2d37] p-5 z-50 safe-area-pb">
          <div className="max-w-[430px] mx-auto">
            <div className="w-full h-14 flex items-center justify-center bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 font-semibold text-base rounded-xl border border-green-200 dark:border-green-800">
              Delivered
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
