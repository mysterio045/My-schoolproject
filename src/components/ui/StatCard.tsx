"use client";

import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label: string; positive: boolean };
  icon: LucideIcon;
}

export default function StatCard({ title, value, subtitle, trend, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 transition-colors hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-[var(--muted-foreground)]">{title}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-[var(--foreground)]">{value}</p>
          {subtitle && (
            <p className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1.5">
              {trend.positive ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              )}
              <span
                className={cn(
                  "text-[12px] font-medium",
                  trend.positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                )}
              >
                {trend.positive ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-[12px] text-[var(--muted-foreground)]">{trend.label}</span>
            </div>
          )}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--muted)]">
          <Icon className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
        </div>
      </div>
    </div>
  );
}
