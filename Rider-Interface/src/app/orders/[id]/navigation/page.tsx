"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Phone,
  Navigation as NavigationIcon,
  MapPin,
  Store,
  User,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { activeOrders } from "@/lib/mock-data";
import type { DeliveryStatus } from "@/lib/types";
import { formatDistance } from "@/lib/utils";

export default function NavigationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const order = activeOrders.find((o) => o.id === id);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!order) {
        setHasError(true);
      }
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [order]);

  const isPickedUp =
    order?.status === "picked_up" || order?.status === "delivered";

  const destination = order
    ? isPickedUp
      ? {
          lat: order.customer.latitude,
          lng: order.customer.longitude,
          name: `${order.customer.firstName} ${order.customer.lastName}`,
          address: order.deliveryAddress,
          phone: order.customer.phone,
          icon: User,
          label: "Customer Drop-off",
        }
      : {
          lat: order.restaurant.latitude,
          lng: order.restaurant.longitude,
          name: order.restaurant.name,
          address: order.restaurant.address,
          phone: order.restaurant.phone,
          icon: Store,
          label: "Restaurant Pickup",
        }
    : null;

  const distance = order
    ? isPickedUp
      ? order.dropoffDistance
      : order.pickupDistance
    : 0;

  const googleMapsUrl = destination
    ? `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=driving`
    : "#";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0c13] flex flex-col items-center justify-center">
        <Loader2 size={32} className="text-green-600 dark:text-green-400 animate-spin mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading navigation...</p>
      </div>
    );
  }

  if (hasError || !order || !destination) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0c13]">
        <div className="bg-white dark:bg-[#0f1117] px-5 pt-12 pb-4 border-b border-gray-100 dark:border-[#2a2d37]">
          <div className="flex items-center gap-3">
            <Link
              href={`/orders/${id}`}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-[#1a1d27] hover:bg-gray-100 dark:hover:bg-[#22252f] transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
            </Link>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Navigation
            </h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={24} className="text-red-500 dark:text-red-400" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Order Not Found
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
            This order could not be found or navigation is not available.
          </p>
          <Link
            href="/orders"
            className="h-11 px-6 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-medium text-sm rounded-xl transition-colors"
          >
            View Orders
          </Link>
        </div>
      </div>
    );
  }

  const DestIcon = destination.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0c13] flex flex-col">
      <div className="bg-white dark:bg-[#0f1117] px-5 pt-12 pb-4 border-b border-gray-100 dark:border-[#2a2d37]">
        <div className="flex items-center gap-3">
          <Link
            href={`/orders/${id}`}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-[#1a1d27] hover:bg-gray-100 dark:hover:bg-[#22252f] transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Navigation
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              #{order.id} &bull; {isPickedUp ? "Delivering to customer" : "Heading to restaurant"}
            </p>
          </div>
          <div className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
            isPickedUp
              ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
              : "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
          }`}>
            {isPickedUp ? "Drop-off" : "Pickup"}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-gray-200 dark:bg-[#1a1d27] h-56 relative flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-10 dark:opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
              backgroundSize: '32px 32px',
            }} />
          </div>
          <div className="absolute top-4 left-4 right-4">
            <div className="bg-white dark:bg-[#22252f] rounded-xl p-3 shadow-lg border border-gray-100 dark:border-[#2a2d37]">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isPickedUp
                    ? "bg-blue-100 dark:bg-blue-900/50"
                    : "bg-green-100 dark:bg-green-900/50"
                }`}>
                  <DestIcon size={16} className={isPickedUp ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {destination.name}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    {destination.address}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
            <MapPin size={40} className={isPickedUp ? "text-blue-500" : "text-green-500"} />
            <span className="text-xs font-medium bg-white dark:bg-[#22252f] px-2.5 py-1 rounded-full shadow-sm border border-gray-100 dark:border-[#2a2d37]">
              {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
            </span>
          </div>

          <div className="absolute bottom-4 right-4">
            <div className="bg-white dark:bg-[#22252f] rounded-lg px-3 py-2 shadow-sm border border-gray-100 dark:border-[#2a2d37]">
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {formatDistance(distance)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 px-5 py-5 space-y-4">
          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2d37] shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isPickedUp
                  ? "bg-blue-100 dark:bg-blue-900/50"
                  : "bg-green-100 dark:bg-green-900/50"
              }`}>
                <DestIcon size={20} className={isPickedUp ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400"} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {destination.label}
                </p>
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {destination.name}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
              {destination.address}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {destination.phone}
            </p>
          </div>

          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2d37] shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Delivery Status
              </span>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {isPickedUp
                ? "Delivering to customer drop-off location"
                : "Heading to restaurant for pickup"}
            </p>
          </div>

          {order.deliveryNotes && (
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-4 border border-amber-200 dark:border-amber-800">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1">
                Delivery Notes
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {order.deliveryNotes}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-[#0f1117] border-t border-gray-200 dark:border-[#2a2d37] p-5 safe-area-pb">
          <div className="max-w-[430px] mx-auto space-y-3">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-14 flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold text-base rounded-xl transition-colors"
            >
              <ExternalLink size={20} />
              Open in Google Maps
            </a>
            <div className="flex gap-3">
              <a
                href={`tel:${destination.phone}`}
                className="flex-1 h-12 flex items-center justify-center gap-2 bg-gray-100 dark:bg-[#1a1d27] text-gray-700 dark:text-gray-300 font-medium text-sm rounded-xl border border-gray-200 dark:border-[#2a2d37] transition-colors"
              >
                <Phone size={16} />
                Call
              </a>
              <Link
                href={`/orders/${id}`}
                className="flex-1 h-12 flex items-center justify-center gap-2 bg-gray-100 dark:bg-[#1a1d27] text-gray-700 dark:text-gray-300 font-medium text-sm rounded-xl border border-gray-200 dark:border-[#2a2d37] transition-colors"
              >
                <NavigationIcon size={16} />
                Order Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
