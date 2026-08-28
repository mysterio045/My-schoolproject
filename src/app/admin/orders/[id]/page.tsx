"use client";

import { useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  MapPin,
  UserPlus,
  CheckCircle,
  Clock,
  CookingPot,
  PackageCheck,
  Bike,
  Navigation,
  CircleCheck,
  X,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import { useApp } from "@/context/AppContext";
import { formatNaira, cn } from "@/lib/utils";
import { showToast } from "@/components/ui/Toast";
import { OrderStatus } from "@/lib/types";

const statusSteps: {
  status: OrderStatus;
  label: string;
  icon: React.ElementType;
}[] = [
  { status: "pending", label: "Pending", icon: Clock },
  { status: "confirmed", label: "Confirmed", icon: CheckCircle },
  { status: "preparing", label: "Preparing", icon: CookingPot },
  { status: "ready", label: "Ready", icon: PackageCheck },
  { status: "assigned", label: "Assigned", icon: UserPlus },
  { status: "on_the_way", label: "On the Way", icon: Navigation },
  { status: "delivered", label: "Delivered", icon: CircleCheck },
];

const statusOrder: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "assigned",
  "on_the_way",
  "delivered",
];

const riderTrackingStatuses = new Set<OrderStatus>([
  "assigned",
  "on_the_way",
  "delivered",
  "cancelled",
]);

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { orders, riders, assignRider } = useApp();
  const order = orders.find((o) => o.id === id);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRider, setSelectedRider] = useState<string | null>(null);

  if (!order) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] py-16">
          <PackageCheck className="h-12 w-12 text-[var(--muted-foreground)] opacity-40" />
          <div className="text-center">
            <p className="text-[15px] font-semibold text-[var(--foreground)]">
              Order not found
            </p>
            <p className="text-[13px] text-[var(--muted-foreground)]">
              The order you&apos;re looking for doesn&apos;t exist.
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
          >
            View All Orders
          </Link>
        </div>
      </div>
    );
  }

  const currentStatusIndex = statusOrder.indexOf(order.status);

  const handleAssignRider = () => {
    if (!selectedRider) return;
    assignRider(order.id, selectedRider);
    const rider = riders.find((r) => r.id === selectedRider);
    showToast("success", `Rider ${rider?.name} assigned to ${order.id}`);
    setShowAssignModal(false);
    setSelectedRider(null);
  };

  const availableRiders = riders.filter((r) => r.status === "available");

  const hasAssignedRider = order.riderId !== null;
  const isTrackingActive =
    hasAssignedRider &&
    order.status !== "delivered" &&
    order.status !== "cancelled";

  const assignedRider = order.riderId
    ? riders.find((r) => r.id === order.riderId)
    : null;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </Link>

      {/* Order Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]">
            <PackageCheck className="h-5 w-5 text-[var(--foreground)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)]">
              {order.id}
            </h1>
            <StatusBadge status={order.status} />
          </div>
        </div>
        {(order.status === "ready" || order.status === "confirmed" || order.status === "preparing") && (
          <button
            onClick={() => setShowAssignModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity self-start"
          >
            <UserPlus className="h-4 w-4" />
            Assign Rider
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left Column - Customer + Items */}
        <div className="xl:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                Customer Information
              </h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]">
                  <span className="text-[12px] font-semibold text-[var(--foreground)]">
                    {order.customerName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[var(--foreground)]">
                    {order.customerName}
                  </p>
                  <p className="text-[12px] text-[var(--muted-foreground)]">
                    Customer ID: {order.customerId}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-[var(--foreground)]">
                <Phone className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                {order.customerPhone}
              </div>
              <div className="flex items-start gap-2 text-[13px] text-[var(--foreground)]">
                <MapPin className="h-3.5 w-3.5 text-[var(--muted-foreground)] mt-0.5 shrink-0" />
                {order.deliveryAddress}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                Order Items
              </h2>
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Food Item
                    </th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-5 py-3 text-right text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="px-5 py-3">
                        <p className="text-[13px] font-medium text-[var(--foreground)]">
                          {item.name}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-[13px] text-[var(--foreground)]">
                          {item.quantity}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-[13px] text-[var(--foreground)]">
                          {formatNaira(item.price)}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="text-[13px] font-medium text-[var(--foreground)]">
                          {formatNaira(item.price * item.quantity)}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Items */}
            <div className="sm:hidden divide-y divide-[var(--border)]">
              {order.items.map((item) => (
                <div key={item.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-medium text-[var(--foreground)]">
                      {item.name}
                    </p>
                    <p className="text-[13px] font-medium text-[var(--foreground)]">
                      {formatNaira(item.price * item.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[12px] text-[var(--muted-foreground)]">
                      Qty: {item.quantity}
                    </p>
                    <p className="text-[12px] text-[var(--muted-foreground)]">
                      {formatNaira(item.price)} each
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Summary + Timeline + Rider Tracking */}
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                Order Summary
              </h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-[var(--muted-foreground)]">
                  Subtotal
                </p>
                <p className="text-[13px] text-[var(--foreground)]">
                  {formatNaira(order.subtotal)}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-[var(--muted-foreground)]">
                  Delivery Fee
                </p>
                <p className="text-[13px] text-[var(--foreground)]">
                  {formatNaira(order.deliveryFee)}
                </p>
              </div>
              <div className="border-t border-[var(--border)] pt-3 flex items-center justify-between">
                <p className="text-[14px] font-semibold text-[var(--foreground)]">
                  Total
                </p>
                <p className="text-[14px] font-semibold text-[var(--foreground)]">
                  {formatNaira(order.total)}
                </p>
              </div>
            </div>
          </div>

          {/* Rider Tracking */}
          {isTrackingActive && assignedRider && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <div className="border-b border-[var(--border)] px-5 py-4">
                <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                  Rider Tracking
                </h2>
              </div>
              <div className="px-5 py-4 space-y-4">
                {/* Rider Info */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]">
                    <span className="text-[13px] font-semibold text-[var(--foreground)]">
                      {assignedRider.avatar}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[var(--foreground)]">
                      {assignedRider.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          assignedRider.status === "available"
                            ? "bg-green-500"
                            : assignedRider.status === "busy"
                            ? "bg-amber-500"
                            : "bg-gray-400"
                        )}
                      />
                      <span className="text-[12px] capitalize text-[var(--muted-foreground)]">
                        {assignedRider.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rider Location */}
                <div className="flex items-start gap-2 text-[13px] text-[var(--foreground)]">
                  <MapPin className="h-3.5 w-3.5 text-[var(--muted-foreground)] mt-0.5 shrink-0" />
                  <span>{assignedRider.location.address}</span>
                </div>

                {/* Distance from Restaurant */}
                <div className="flex items-center justify-between rounded-lg bg-[var(--accent)] px-3 py-2">
                  <span className="text-[12px] text-[var(--muted-foreground)]">
                    Distance from restaurant
                  </span>
                  <span className="text-[13px] font-medium text-[var(--foreground)]">
                    {assignedRider.distanceFromRestaurant} km
                  </span>
                </div>

                {/* Mock Map */}
                <div className="relative h-[160px] bg-[var(--muted)] rounded-lg overflow-hidden">
                  {/* Grid lines */}
                  <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="rider-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                        <path
                          d="M 30 0 L 0 0 0 30"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="0.5"
                          className="text-[var(--border)]"
                        />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#rider-grid)" />
                    {/* Roads */}
                    <line x1="10%" y1="50%" x2="90%" y2="50%" stroke="currentColor" strokeWidth="1.5" className="text-[var(--border)]" opacity="0.7" />
                    <line x1="50%" y1="10%" x2="50%" y2="90%" stroke="currentColor" strokeWidth="1.5" className="text-[var(--border)]" opacity="0.7" />
                  </svg>

                  {/* Restaurant marker */}
                  <div
                    className="absolute flex items-center gap-1"
                    style={{ left: "45%", top: "42%" }}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--foreground)] shadow-md">
                      <MapPin className="h-3 w-3 text-[var(--background)]" />
                    </div>
                    <span className="rounded bg-[var(--foreground)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--background)] shadow-md whitespace-nowrap">
                      Restaurant
                    </span>
                  </div>

                  {/* Rider marker */}
                  <div
                    className="absolute"
                    style={{ left: "65%", top: "35%" }}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 shadow-md">
                      <Bike className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-md whitespace-nowrap">
                      {assignedRider.name.split(" ")[0]}
                    </span>
                  </div>
                </div>

                {/* Estimated Delivery */}
                {order.estimatedDelivery && (
                  <div className="flex items-center justify-between rounded-lg bg-[var(--accent)] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                      <span className="text-[12px] text-[var(--muted-foreground)]">
                        Estimated delivery
                      </span>
                    </div>
                    <span className="text-[13px] font-medium text-[var(--foreground)]">
                      {new Date(order.estimatedDelivery).toLocaleTimeString(
                        "en-NG",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Order Timeline */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                Order Timeline
              </h2>
            </div>
            <div className="px-5 py-4">
              <div className="relative">
                {statusSteps.map((step, index) => {
                  const timelineEvent = order.timeline.find(
                    (e) => e.status === step.status
                  );
                  const isCompleted = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  const Icon = step.icon;

                  return (
                    <div key={step.status} className="relative flex gap-3 pb-6 last:pb-0">
                      {/* Connector Line */}
                      {index < statusSteps.length - 1 && (
                        <div
                          className={cn(
                            "absolute left-[15px] top-[32px] h-[calc(100%-20px)] w-px",
                            isCompleted
                              ? "bg-[var(--primary)]"
                              : "bg-[var(--border)]"
                          )}
                        />
                      )}

                      {/* Step Circle */}
                      <div
                        className={cn(
                          "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          isCurrent
                            ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                            : isCompleted
                              ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                              : "bg-[var(--accent)] text-[var(--muted-foreground)]"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-[13px] font-medium",
                            isCompleted
                              ? "text-[var(--foreground)]"
                              : "text-[var(--muted-foreground)]"
                          )}
                        >
                          {step.label}
                        </p>
                        {timelineEvent && (
                          <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                            {new Date(timelineEvent.timestamp).toLocaleString(
                              "en-NG",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assign Rider Modal */}
      <Modal
        open={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedRider(null);
        }}
        title="Assign Rider"
      >
        <div className="space-y-4">
          <p className="text-[13px] text-[var(--muted-foreground)]">
            Select an available rider to assign to order {order.id}.
          </p>

          {availableRiders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <Bike className="h-10 w-10 text-[var(--muted-foreground)] opacity-40" />
              <p className="text-[13px] text-[var(--muted-foreground)]">
                No riders available at the moment
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {availableRiders.map((rider) => (
                <button
                  key={rider.id}
                  onClick={() => setSelectedRider(rider.id)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    selectedRider === rider.id
                      ? "border-[var(--primary)] bg-[var(--primary)]/5"
                      : "border-[var(--border)] hover:bg-[var(--accent)]"
                  )}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)]">
                    <span className="text-[12px] font-semibold text-[var(--foreground)]">
                      {rider.avatar}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[var(--foreground)]">
                      {rider.name}
                    </p>
                    <p className="text-[12px] text-[var(--muted-foreground)]">
                      {rider.distanceFromRestaurant} km away &middot;{" "}
                      {rider.todayDeliveries} deliveries today
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-medium text-[var(--foreground)]">
                      {rider.rating} ★
                    </p>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      {rider.averageDeliveryTime} min avg
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowAssignModal(false);
                setSelectedRider(null);
              }}
              className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignRider}
              disabled={!selectedRider}
              className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Assign Rider
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
