"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { mockAnalytics } from "@/lib/mock-data";
import { formatNumber } from "@/lib/utils";

const periods = ["Today", "7 Days", "30 Days"] as const;

export default function PerformanceChart() {
  const [period, setPeriod] = useState<(typeof periods)[number]>("Today");

  const data = period === "Today"
    ? [
        { label: "6am", orders: 12 },
        { label: "8am", orders: 28 },
        { label: "10am", orders: 45 },
        { label: "12pm", orders: 62 },
        { label: "2pm", orders: 38 },
        { label: "4pm", orders: 52 },
        { label: "6pm", orders: 58 },
        { label: "8pm", orders: 35 },
      ]
    : period === "7 Days"
    ? mockAnalytics.orders.map((d) => ({ label: d.date, orders: d.count }))
    : mockAnalytics.orders.map((d) => ({ label: d.date, orders: d.count * 4 }));

  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Today&apos;s Performance</h2>
          <p className="text-[12px] text-[var(--muted-foreground)]">
            Delivery orders by time
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as typeof periods[number])}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-[12px] font-medium text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
        >
          {periods.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="px-5 pb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[var(--foreground)]">{formatNumber(totalOrders)}</span>
          <span className="text-[12px] text-[var(--muted-foreground)]">Total orders</span>
        </div>
      </div>

      <div className="flex-1 px-2 pb-4 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="25%">
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border)"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              cursor={{ fill: "var(--accent)", opacity: 0.5 }}
            />
            <Bar
              dataKey="orders"
              fill="var(--foreground)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
