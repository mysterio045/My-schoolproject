import { AnalyticsData } from "../types";

// This module is intentionally 100% deterministic — no Math.random() and no
// new Date(). All values are fixed constants so that the server-rendered HTML
// matches the client-rendered output exactly (prevents hydration mismatches).

// Fixed, static weekday labels (Mon -> Sun) rather than deriving from the live clock.
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const mockAnalytics: AnalyticsData = {
  revenue: DAYS.map((date, i) => {
    const base = [380000, 425000, 475000, 520000, 610000, 680000, 750000][i];
    return { date, amount: base };
  }),
  orders: DAYS.map((date, i) => {
    const base = [48, 52, 58, 65, 78, 87, 95][i];
    return { date, count: base };
  }),
  popularItems: [
    { name: "Jollof Rice", orders: 1245, revenue: 4357500 },
    { name: "Chicken Shawarma", orders: 1567, revenue: 5484500 },
    { name: "Chicken", orders: 1102, revenue: 2755000 },
    { name: "Suya", orders: 1456, revenue: 2184000 },
    { name: "Puff Puff", orders: 1890, revenue: 567000 },
    { name: "Coca-Cola", orders: 2340, revenue: 1170000 },
  ],
  deliveryPerformance: DAYS.map((date, i) => {
    const onTime = [42, 45, 52, 58, 70, 80, 87][i];
    const late = [6, 7, 6, 7, 8, 7, 8][i];
    return { date, onTime, late };
  }),
};

// Static daily summary — constant values shared by server and client renders.
export const mockDailySummary = {
  ordersToday: 255,
  ordersChange: 12.4,
  onTimeDelivery: 95.5,
  deliveryChange: 3.2,
  activeRiders: 18,
  totalRiders: 22,
  ridersOnlineChange: 3,
  grossSales: 4972500,
  salesChange: 8.6,
};
