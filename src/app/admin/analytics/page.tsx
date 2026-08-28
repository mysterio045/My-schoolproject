"use client";

import { useState, useMemo } from "react";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Clock,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { mockAnalytics } from "@/lib/mock-data";
import { formatNaira, formatNumber, cn } from "@/lib/utils";
import type { AnalyticsData } from "@/lib/types";

type TimePeriod = "today" | "7days" | "30days" | "90days";

const timePeriods: { value: TimePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7days", label: "7 Days" },
  { value: "30days", label: "30 Days" },
  { value: "90days", label: "90 Days" },
];

function computeSummaryStats(data: AnalyticsData) {
  const totalRevenue = data.revenue.reduce((sum, r) => sum + r.amount, 0);
  const totalOrders = data.orders.reduce((sum, o) => sum + o.count, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const totalOnTime = data.deliveryPerformance.reduce(
    (sum, d) => sum + d.onTime,
    0
  );
  const totalLate = data.deliveryPerformance.reduce(
    (sum, d) => sum + d.late,
    0
  );
  const totalDeliveries = totalOnTime + totalLate;
  const avgDeliveryTime = totalDeliveries > 0
    ? Math.round((totalOnTime / totalDeliveries) * 100)
    : 0;

  const dailyOrders = data.orders.map((o) => o.count);
  const firstHalf = dailyOrders.slice(0, Math.ceil(dailyOrders.length / 2));
  const secondHalf = dailyOrders.slice(Math.ceil(dailyOrders.length / 2));
  const firstHalfAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.length > 0
    ? secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length
    : firstHalfAvg;
  const customerGrowth = firstHalfAvg > 0
    ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100
    : 0;

  return {
    totalRevenue,
    totalOrders,
    avgOrderValue,
    onTimeRate: avgDeliveryTime,
    customerGrowth: Math.round(customerGrowth * 10) / 10,
  };
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
          {title}
        </h2>
        <p className="text-[12px] text-[var(--muted-foreground)]">{subtitle}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<TimePeriod>("7days");

  const filteredData = useMemo(() => {
    const data = mockAnalytics;
    switch (period) {
      case "today":
        return {
          revenue: data.revenue.slice(-1),
          orders: data.orders.slice(-1),
          popularItems: data.popularItems,
          deliveryPerformance: data.deliveryPerformance.slice(-1),
        };
      case "7days":
        return data;
      case "30days":
        return {
          ...data,
          revenue: [
            ...data.revenue,
            ...data.revenue.map((r, i) => ({
              date: `W2-${r.date}`,
              amount: r.amount + Math.round(r.amount * 0.1 * (i % 3 === 0 ? 1 : -0.5)),
            })),
            ...data.revenue.map((r, i) => ({
              date: `W3-${r.date}`,
              amount: r.amount + Math.round(r.amount * 0.15 * (i % 2 === 0 ? 1 : -0.3)),
            })),
            ...data.revenue.map((r, i) => ({
              date: `W4-${r.date}`,
              amount: r.amount + Math.round(r.amount * 0.2 * (i % 2 === 0 ? -1 : 1)),
            })),
          ],
          orders: [
            ...data.orders,
            ...data.orders.map((o, i) => ({
              date: `W2-${o.date}`,
              count: o.count + Math.round(o.count * 0.08 * (i % 3 === 0 ? 1 : -0.4)),
            })),
            ...data.orders.map((o, i) => ({
              date: `W3-${o.date}`,
              count: o.count + Math.round(o.count * 0.12 * (i % 2 === 0 ? 1 : -0.2)),
            })),
            ...data.orders.map((o, i) => ({
              date: `W4-${o.date}`,
              count: o.count + Math.round(o.count * 0.18 * (i % 2 === 0 ? -1 : 1)),
            })),
          ],
          deliveryPerformance: [
            ...data.deliveryPerformance,
            ...data.deliveryPerformance.map((d, i) => ({
              date: `W2-${d.date}`,
              onTime: d.onTime + Math.round(d.onTime * 0.05 * (i % 2 === 0 ? 1 : -1)),
              late: d.late + Math.round(d.late * 0.1 * (i % 2 === 0 ? -1 : 1)),
            })),
            ...data.deliveryPerformance.map((d, i) => ({
              date: `W3-${d.date}`,
              onTime: d.onTime + Math.round(d.onTime * 0.1 * (i % 2 === 0 ? -1 : 1)),
              late: d.late + Math.round(d.late * 0.05 * (i % 2 === 0 ? 1 : -1)),
            })),
            ...data.deliveryPerformance.map((d, i) => ({
              date: `W4-${d.date}`,
              onTime: d.onTime + Math.round(d.onTime * 0.12 * (i % 3 === 0 ? 1 : -1)),
              late: d.late + Math.round(d.late * 0.08 * (i % 3 === 0 ? -1 : 1)),
            })),
          ],
        };
      case "90days":
        return {
          ...data,
          revenue: [
            ...data.revenue,
            ...data.revenue.map((r, i) => ({
              date: `W2-${r.date}`,
              amount: r.amount + Math.round(r.amount * 0.1 * (i % 3 === 0 ? 1 : -0.5)),
            })),
            ...data.revenue.map((r, i) => ({
              date: `W3-${r.date}`,
              amount: r.amount + Math.round(r.amount * 0.15 * (i % 2 === 0 ? 1 : -0.3)),
            })),
            ...data.revenue.map((r, i) => ({
              date: `W4-${r.date}`,
              amount: r.amount + Math.round(r.amount * 0.2 * (i % 2 === 0 ? -1 : 1)),
            })),
            ...data.revenue.map((r, i) => ({
              date: `M2-${r.date}`,
              amount: r.amount + Math.round(r.amount * 0.25 * (i % 2 === 0 ? 1 : -1)),
            })),
            ...data.revenue.map((r, i) => ({
              date: `M2W2-${r.date}`,
              amount: r.amount + Math.round(r.amount * 0.3 * (i % 3 === 0 ? 1 : -0.5)),
            })),
            ...data.revenue.map((r, i) => ({
              date: `M2W3-${r.date}`,
              amount: r.amount + Math.round(r.amount * 0.35 * (i % 2 === 0 ? 1 : -0.2)),
            })),
            ...data.revenue.map((r, i) => ({
              date: `M3-${r.date}`,
              amount: r.amount + Math.round(r.amount * 0.4 * (i % 2 === 0 ? -1 : 1)),
            })),
          ],
          orders: [
            ...data.orders,
            ...data.orders.map((o, i) => ({
              date: `W2-${o.date}`,
              count: o.count + Math.round(o.count * 0.08 * (i % 3 === 0 ? 1 : -0.4)),
            })),
            ...data.orders.map((o, i) => ({
              date: `W3-${o.date}`,
              count: o.count + Math.round(o.count * 0.12 * (i % 2 === 0 ? 1 : -0.2)),
            })),
            ...data.orders.map((o, i) => ({
              date: `W4-${o.date}`,
              count: o.count + Math.round(o.count * 0.18 * (i % 2 === 0 ? -1 : 1)),
            })),
            ...data.orders.map((o, i) => ({
              date: `M2-${o.date}`,
              count: o.count + Math.round(o.count * 0.22 * (i % 2 === 0 ? 1 : -1)),
            })),
            ...data.orders.map((o, i) => ({
              date: `M2W2-${o.date}`,
              count: o.count + Math.round(o.count * 0.28 * (i % 3 === 0 ? 1 : -0.4)),
            })),
            ...data.orders.map((o, i) => ({
              date: `M2W3-${o.date}`,
              count: o.count + Math.round(o.count * 0.32 * (i % 2 === 0 ? 1 : -0.2)),
            })),
            ...data.orders.map((o, i) => ({
              date: `M3-${o.date}`,
              count: o.count + Math.round(o.count * 0.38 * (i % 2 === 0 ? -1 : 1)),
            })),
          ],
          deliveryPerformance: [
            ...data.deliveryPerformance,
            ...data.deliveryPerformance.map((d, i) => ({
              date: `W2-${d.date}`,
              onTime: d.onTime + Math.round(d.onTime * 0.05 * (i % 2 === 0 ? 1 : -1)),
              late: d.late + Math.round(d.late * 0.1 * (i % 2 === 0 ? -1 : 1)),
            })),
            ...data.deliveryPerformance.map((d, i) => ({
              date: `W3-${d.date}`,
              onTime: d.onTime + Math.round(d.onTime * 0.1 * (i % 2 === 0 ? -1 : 1)),
              late: d.late + Math.round(d.late * 0.05 * (i % 2 === 0 ? 1 : -1)),
            })),
            ...data.deliveryPerformance.map((d, i) => ({
              date: `W4-${d.date}`,
              onTime: d.onTime + Math.round(d.onTime * 0.12 * (i % 3 === 0 ? 1 : -1)),
              late: d.late + Math.round(d.late * 0.08 * (i % 3 === 0 ? -1 : 1)),
            })),
            ...data.deliveryPerformance.map((d, i) => ({
              date: `M2-${d.date}`,
              onTime: d.onTime + Math.round(d.onTime * 0.15 * (i % 2 === 0 ? 1 : -1)),
              late: d.late + Math.round(d.late * 0.12 * (i % 2 === 0 ? -1 : 1)),
            })),
            ...data.deliveryPerformance.map((d, i) => ({
              date: `M2W2-${d.date}`,
              onTime: d.onTime + Math.round(d.onTime * 0.18 * (i % 3 === 0 ? 1 : -1)),
              late: d.late + Math.round(d.late * 0.15 * (i % 3 === 0 ? -1 : 1)),
            })),
            ...data.deliveryPerformance.map((d, i) => ({
              date: `M2W3-${d.date}`,
              onTime: d.onTime + Math.round(d.onTime * 0.2 * (i % 2 === 0 ? 1 : -1)),
              late: d.late + Math.round(d.late * 0.1 * (i % 2 === 0 ? -1 : 1)),
            })),
            ...data.deliveryPerformance.map((d, i) => ({
              date: `M3-${d.date}`,
              onTime: d.onTime + Math.round(d.onTime * 0.22 * (i % 2 === 0 ? -1 : 1)),
              late: d.late + Math.round(d.late * 0.08 * (i % 2 === 0 ? 1 : -1)),
            })),
          ],
        };
      default:
        return data;
    }
  }, [period]);

  const stats = useMemo(
    () => computeSummaryStats(filteredData),
    [filteredData]
  );

  const popularItemsSorted = useMemo(
    () =>
      [...filteredData.popularItems].sort((a, b) => b.orders - a.orders),
    [filteredData.popularItems]
  );

  const summaryCards = [
    {
      title: "Revenue",
      value: formatNaira(stats.totalRevenue),
      icon: DollarSign,
      trend: { value: 8.2, label: "vs last period", positive: true },
    },
    {
      title: "Orders",
      value: formatNumber(stats.totalOrders),
      icon: ShoppingBag,
      trend: { value: 12.5, label: "vs last period", positive: true },
    },
    {
      title: "Average Order Value",
      value: formatNaira(Math.round(stats.avgOrderValue)),
      icon: TrendingUp,
      trend: { value: 3.1, label: "vs last period", positive: true },
    },
    {
      title: "On-Time Delivery",
      value: `${stats.onTimeRate}%`,
      icon: Clock,
      trend: { value: 2.3, label: "vs last period", positive: true },
    },
    {
      title: "Customer Growth",
      value: `${stats.customerGrowth > 0 ? "+" : ""}${stats.customerGrowth}%`,
      icon: Users,
      trend: {
        value: Math.abs(stats.customerGrowth),
        label: "vs last period",
        positive: stats.customerGrowth >= 0,
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Analytics</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
            Track your restaurant&apos;s performance and growth.
          </p>
        </div>

        {/* Time Period Filter */}
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-1 self-start">
          {timePeriods.map((tp) => (
            <button
              key={tp.value}
              onClick={() => setPeriod(tp.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                period === tp.value
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {tp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 transition-colors hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-[var(--muted-foreground)]">
                  {card.title}
                </p>
                <p className="mt-1.5 text-2xl font-bold tracking-tight text-[var(--foreground)]">
                  {card.value}
                </p>
                {card.trend && (
                  <div className="mt-2 flex items-center gap-1.5">
                    {card.trend.positive ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <TrendingUp className="h-3.5 w-3.5 rotate-180 text-red-500" />
                    )}
                    <span
                      className={cn(
                        "text-[12px] font-medium",
                        card.trend.positive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-500"
                      )}
                    >
                      {card.trend.positive ? "+" : ""}
                      {card.trend.value}%
                    </span>
                    <span className="text-[12px] text-[var(--muted-foreground)]">
                      {card.trend.label}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--muted)]">
                <card.icon className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue & Orders Charts Row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Revenue Over Time */}
        <ChartCard
          title="Revenue Over Time"
          subtitle="Daily revenue for the selected period"
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredData.revenue}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatNumber(v)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "var(--foreground)",
                  }}
                  formatter={(value) => [formatNaira(Number(value)), "Revenue"]}
                />
                <Bar
                  dataKey="amount"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Orders Over Time */}
        <ChartCard
          title="Orders Over Time"
          subtitle="Daily order count for the selected period"
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredData.orders}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "var(--foreground)",
                  }}
                  formatter={(value) => [Number(value), "Orders"]}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--primary)" }}
                  activeDot={{ r: 5, fill: "var(--primary)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Popular Items & Delivery Performance Row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Popular Food Items */}
        <ChartCard
          title="Popular Food Items"
          subtitle="Top items ranked by order count"
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={popularItemsSorted}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatNumber(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "var(--foreground)",
                  }}
                  formatter={(value, name) => [
                    name === "orders" ? `${formatNumber(Number(value))} orders` : formatNaira(Number(value)),
                    name === "orders" ? "Orders" : "Revenue",
                  ]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "12px" }}
                />
                <Bar
                  dataKey="orders"
                  fill="var(--primary)"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={24}
                  name="Orders"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Delivery Performance */}
        <ChartCard
          title="Delivery Performance"
          subtitle="On-time vs late deliveries by day"
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredData.deliveryPerformance}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "var(--foreground)",
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "12px" }}
                />
                <Bar
                  dataKey="onTime"
                  stackId="delivery"
                  fill="#22c55e"
                  name="On Time"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="late"
                  stackId="delivery"
                  fill="#ef4444"
                  name="Late"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
