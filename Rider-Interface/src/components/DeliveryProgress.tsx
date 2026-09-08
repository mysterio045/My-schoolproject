"use client";

import type { DeliveryStatus } from "@/lib/types";
import { Check } from "lucide-react";

interface DeliveryProgressProps {
  currentStatus: DeliveryStatus;
  orderPlacedAt: string;
  preparingAt?: string;
  readyAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
}

interface Step {
  key: string;
  label: string;
  timestamp?: string;
  status: "completed" | "current" | "upcoming";
}

export default function DeliveryProgress({
  currentStatus,
  orderPlacedAt,
  preparingAt,
  readyAt,
  pickedUpAt,
  deliveredAt,
}: DeliveryProgressProps) {
  const statusOrder: DeliveryStatus[] = [
    "assigned",
    "preparing",
    "ready_for_pickup",
    "picked_up",
    "delivered",
  ];

  const currentIndex = statusOrder.indexOf(currentStatus);

  const steps: Step[] = [
    {
      key: "assigned",
      label: "Order Assigned",
      timestamp: orderPlacedAt,
      status: currentIndex >= 0 ? "completed" : "upcoming",
    },
    {
      key: "preparing",
      label: "Preparing",
      timestamp: preparingAt,
      status:
        currentIndex > 1
          ? "completed"
          : currentIndex === 1
          ? "current"
          : "upcoming",
    },
    {
      key: "ready_for_pickup",
      label: "Ready for Pickup",
      timestamp: readyAt,
      status:
        currentIndex > 2
          ? "completed"
          : currentIndex === 2
          ? "current"
          : "upcoming",
    },
    {
      key: "picked_up",
      label: "Picked Up",
      timestamp: pickedUpAt,
      status:
        currentIndex > 3
          ? "completed"
          : currentIndex === 3
          ? "current"
          : "upcoming",
    },
    {
      key: "delivered",
      label: "Delivered",
      timestamp: deliveredAt,
      status:
        currentIndex >= 4
          ? "completed"
          : currentIndex === 4
          ? "current"
          : "upcoming",
    },
  ];

  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isCompleted = step.status === "completed";
        const isCurrent = step.status === "current";

        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isCompleted
                    ? "bg-green-600"
                    : isCurrent
                    ? "bg-amber-500"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                {isCompleted && (
                  <Check size={14} className="text-white" strokeWidth={3} />
                )}
                {isCurrent && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 h-8 ${
                    isCompleted ? "bg-green-200 dark:bg-green-800" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              )}
            </div>
            <div className="pb-6 pt-0.5">
              <p
                className={`text-sm font-medium ${
                  isCompleted || isCurrent
                    ? "text-gray-900 dark:text-gray-100"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {step.label}
              </p>
              {isCurrent && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  We&apos;ll notify you when it&apos;s ready
                </p>
              )}
              {isCompleted && step.timestamp && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {new Date(step.timestamp).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
