import type { DeliveryStatus } from "./types";

export function getStatusColor(status: DeliveryStatus): string {
  switch (status) {
    case "assigned":
      return "bg-blue-50 text-blue-700";
    case "preparing":
      return "bg-amber-50 text-amber-700";
    case "ready_for_pickup":
      return "bg-emerald-50 text-emerald-700";
    case "picked_up":
      return "bg-blue-50 text-blue-700";
    case "delivered":
      return "bg-green-50 text-green-700";
    case "cancelled":
      return "bg-red-50 text-red-700";
    default:
      return "bg-gray-50 text-gray-700";
  }
}

export function getStatusLabel(status: DeliveryStatus): string {
  switch (status) {
    case "assigned":
      return "Assigned";
    case "preparing":
      return "Preparing";
    case "ready_for_pickup":
      return "Ready for Pickup";
    case "picked_up":
      return "Picked Up";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatCurrency(amount: number): string {
  return `₦${amount.toFixed(2)}`;
}

export function formatDistance(km: number): string {
  return `${km.toFixed(1)} km`;
}
