"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  MapPin,
  CheckCircle,
  Clock,
  CookingPot,
  PackageCheck,
  CircleCheck,
  XCircle,
  RefreshCw,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingState from "@/components/ui/LoadingState";
import { formatNaira, cn, getInitials } from "@/lib/utils";
import { showToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/api/errors";
import { getOrder, getDeliveryByOrder, getRider, updateOrderStatus } from "@/lib/api/orders";
import { getNextOrderStatus, canCancelOrder, ORDER_LIFECYCLE } from "@/lib/order-status";
import type {
  DeliveryRecord,
  DeliveryStatus,
  OrderRecord,
  RiderRecord,
} from "@/lib/types";

const lifecycleSteps: { status: string; label: string; icon: React.ElementType }[] = [
  { status: "pending", label: "Pending", icon: Clock },
  { status: "confirmed", label: "Confirmed", icon: CheckCircle },
  { status: "preparing", label: "Preparing", icon: CookingPot },
  { status: "ready", label: "Ready", icon: PackageCheck },
  { status: "completed", label: "Completed", icon: CircleCheck },
];

const deliveryStatusLabels: Record<DeliveryStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  accepted: "Accepted",
  picked_up: "Picked up",
  on_the_way: "On the way",
  delivered: "Delivered",
  failed: "Failed",
};

function formatStamp(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-NG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [delivery, setDelivery] = useState<DeliveryRecord | null>(null);
  const [rider, setRider] = useState<RiderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getOrder(id);
      setOrder(data);
      setError(null);
      try {
        const d = await getDeliveryByOrder(data.id);
        setDelivery(d);
        if (d.rider_id) {
          try {
            const r = await getRider(d.rider_id);
            setRider(r);
          } catch {
            setRider(null);
          }
        } else {
          setRider(null);
        }
      } catch {
        setDelivery(null);
        setRider(null);
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (loading && !order) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <LoadingState />
        </div>
      </div>
    );
  }

  if (!order || error) {
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
              {error ?? "The order you're looking for doesn't exist."}
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

  const nextStatus = getNextOrderStatus(order.status);
  const canCancel = canCancelOrder(order.status);
  const stepDone = new Set(order.timeline.map((e) => e.status));
  const currentIndex = order.status === "cancelled" ? -1 : ORDER_LIFECYCLE.indexOf(order.status);
  const cancelledEvent = order.timeline.find((e) => e.status === "cancelled");

  const handleAdvance = async () => {
    if (!nextStatus) return;
    setUpdating(true);
    try {
      const updated = await updateOrderStatus(order.id, nextStatus);
      setOrder(updated);
      showToast("success", "Order status updated");
    } catch (err) {
      showToast("error", getErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    setUpdating(true);
    try {
      const updated = await updateOrderStatus(order.id, "cancelled");
      setOrder(updated);
      showToast("success", "Order cancelled");
    } catch (err) {
      showToast("error", getErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  };

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
              {order.order_number}
            </h1>
            <div className="mt-1">
              <StatusBadge status={order.status} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start">
          {nextStatus && (
            <button
              onClick={handleAdvance}
              disabled={updating}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={cn("h-4 w-4", updating && "animate-spin")} />
              Advance to {nextStatus === "completed" ? "Completed" : nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
            </button>
          )}
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={updating}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <XCircle className="h-4 w-4" />
              Cancel Order
            </button>
          )}
        </div>
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
                    {getInitials(order.customer_name)}
                  </span>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[var(--foreground)]">
                    {order.customer_name}
                  </p>
                  <p className="text-[12px] text-[var(--muted-foreground)]">
                    Customer ID: {order.customer_id}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-[var(--foreground)]">
                <Phone className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                {order.customer_phone}
              </div>
              <div className="flex items-start gap-2 text-[13px] text-[var(--foreground)]">
                <MapPin className="h-3.5 w-3.5 text-[var(--muted-foreground)] mt-0.5 shrink-0" />
                {order.delivery_address}
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
                          {item.name_snapshot}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-[13px] text-[var(--foreground)]">
                          {item.quantity}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-[13px] text-[var(--foreground)]">
                          {formatNaira(item.unit_price)}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="text-[13px] font-medium text-[var(--foreground)]">
                          {formatNaira(item.line_total)}
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
                      {item.name_snapshot}
                    </p>
                    <p className="text-[13px] font-medium text-[var(--foreground)]">
                      {formatNaira(item.line_total)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[12px] text-[var(--muted-foreground)]">
                      Qty: {item.quantity}
                    </p>
                    <p className="text-[12px] text-[var(--muted-foreground)]">
                      {formatNaira(item.unit_price)} each
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Summary + Delivery + Timeline */}
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
                  {formatNaira(order.delivery_fee)}
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
              {order.notes && (
                <div className="rounded-lg bg-[var(--accent)] px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
                    Notes
                  </p>
                  <p className="mt-0.5 text-[13px] text-[var(--foreground)]">
                    {order.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Information */}
          {delivery && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <div className="border-b border-[var(--border)] px-5 py-4">
                <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                  Delivery Information
                </h2>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[var(--muted-foreground)]">
                    Delivery status
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--foreground)]">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        delivery.status === "delivered"
                          ? "bg-green-500"
                          : delivery.status === "failed"
                          ? "bg-red-500"
                          : delivery.status === "pending"
                          ? "bg-gray-400"
                          : "bg-amber-500"
                      )}
                    />
                    {deliveryStatusLabels[delivery.status]}
                  </span>
                </div>

                {delivery.delivery_location && (
                  <div className="flex items-start gap-2 text-[13px] text-[var(--foreground)]">
                    <MapPin className="h-3.5 w-3.5 text-[var(--muted-foreground)] mt-0.5 shrink-0" />
                    {delivery.delivery_location}
                  </div>
                )}

                {delivery.assigned_at && (
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[var(--muted-foreground)]">Assigned</span>
                    <span className="text-[var(--foreground)]">
                      {formatStamp(delivery.assigned_at)}
                    </span>
                  </div>
                )}
                {delivery.picked_up_at && (
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[var(--muted-foreground)]">Picked up</span>
                    <span className="text-[var(--foreground)]">
                      {formatStamp(delivery.picked_up_at)}
                    </span>
                  </div>
                )}
                {delivery.delivered_at && (
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[var(--muted-foreground)]">Delivered</span>
                    <span className="text-[var(--foreground)]">
                      {formatStamp(delivery.delivered_at)}
                    </span>
                  </div>
                )}
                {delivery.failed_at && (
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[var(--muted-foreground)]">Failed</span>
                    <span className="text-[var(--foreground)]">
                      {formatStamp(delivery.failed_at)}
                    </span>
                  </div>
                )}
                {delivery.failure_reason && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    {delivery.failure_reason}
                  </div>
                )}

                {rider && (
                  <div className="mt-2 border-t border-[var(--border)] pt-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]">
                        <span className="text-[13px] font-semibold text-[var(--foreground)]">
                          {rider.avatar || getInitials(rider.name)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-[var(--foreground)]">
                          {rider.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full",
                              rider.status === "available"
                                ? "bg-green-500"
                                : rider.status === "busy"
                                ? "bg-amber-500"
                                : "bg-gray-400"
                            )}
                          />
                          <span className="text-[12px] capitalize text-[var(--muted-foreground)]">
                            {rider.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-[13px] text-[var(--foreground)]">
                      <MapPin className="h-3.5 w-3.5 text-[var(--muted-foreground)] mt-0.5 shrink-0" />
                      <span>{rider.location_address || "Location unavailable"}</span>
                    </div>
                    {rider.distance_from_restaurant != null && (
                      <div className="flex items-center justify-between rounded-lg bg-[var(--accent)] px-3 py-2">
                        <span className="text-[12px] text-[var(--muted-foreground)]">
                          Distance from restaurant
                        </span>
                        <span className="text-[13px] font-medium text-[var(--foreground)]">
                          {Number(rider.distance_from_restaurant).toFixed(1)} km
                        </span>
                      </div>
                    )}
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
                {lifecycleSteps.map((step, index) => {
                  const event = order.timeline.find((e) => e.status === step.status);
                  const isCompleted = stepDone.has(step.status);
                  const isCurrent = index === currentIndex;
                  const Icon = step.icon;

                  return (
                    <div key={step.status} className="relative flex gap-3 pb-6 last:pb-0">
                      {/* Connector Line */}
                      {index < lifecycleSteps.length - 1 && (
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
                        {event && (
                          <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                            {formatStamp(event.created_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Cancelled state */}
                {order.status === "cancelled" && (
                  <div className="relative flex gap-3">
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                      <XCircle className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-red-600">
                        Cancelled
                      </p>
                      {cancelledEvent && (
                        <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                          {formatStamp(cancelledEvent.created_at)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}