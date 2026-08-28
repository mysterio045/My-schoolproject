import { cn } from "@/lib/utils";
import { OrderStatus, RiderStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: OrderStatus | RiderStatus;
  className?: string;
}

const orderStatusStyles: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  confirmed: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  preparing: "bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400",
  ready: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  assigned: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400",
  on_the_way: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400",
  delivered: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

const riderStatusStyles: Record<RiderStatus, string> = {
  available: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  busy: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  offline: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const orderStatusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  assigned: "Assigned",
  on_the_way: "On the Way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const riderStatusLabels: Record<RiderStatus, string> = {
  available: "Available",
  busy: "Busy",
  offline: "Offline",
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const isRider = status === "available" || status === "busy" || status === "offline";
  const styles = isRider ? riderStatusStyles[status as RiderStatus] : orderStatusStyles[status as OrderStatus];
  const label = isRider ? riderStatusLabels[status as RiderStatus] : orderStatusLabels[status as OrderStatus];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-medium",
        styles,
        className
      )}
    >
      {label}
    </span>
  );
}
