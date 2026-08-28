import { AnalyticsData } from "../types";

function getDayLabels(): string[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date().getDay();
  return Array.from({ length: 7 }, (_, i) => {
    const idx = (today - 6 + i + 7) % 7;
    return days[idx];
  });
}

function generateWeeklyData<T>(baseValues: number[], spread: number, transform: (val: number, day: string, index: number) => T): T[] {
  const days = getDayLabels();
  return baseValues.map((base, i) => {
    const jitter = Math.round((Math.random() - 0.5) * 2 * spread);
    return transform(base + jitter, days[i], i);
  });
}

const revenueBase = [380000, 425000, 475000, 520000, 610000, 680000, 750000];
const ordersBase = [48, 52, 58, 65, 78, 87, 95];
const onTimeBase = [42, 45, 52, 58, 70, 80, 87];
const lateBase = [6, 7, 6, 7, 8, 7, 8];

export const mockAnalytics: AnalyticsData = {
  revenue: generateWeeklyData(revenueBase, 40000, (amount, date) => ({ date, amount })),
  orders: generateWeeklyData(ordersBase, 8, (count, date) => ({ date, count })),
  popularItems: [
    { name: "Jollof Rice", orders: 1245, revenue: 4357500 },
    { name: "Chicken Shawarma", orders: 1567, revenue: 5484500 },
    { name: "Chicken", orders: 1102, revenue: 2755000 },
    { name: "Suya", orders: 1456, revenue: 2184000 },
    { name: "Puff Puff", orders: 1890, revenue: 567000 },
    { name: "Coca-Cola", orders: 2340, revenue: 1170000 },
  ],
  deliveryPerformance: generateWeeklyData(onTimeBase, 5, (onTime, date, i) => ({
    date,
    onTime,
    late: lateBase[i],
  })),
};

function getHourOfDay(): number {
  return new Date().getHours();
}

function generateTodaySummary() {
  const hour = getHourOfDay();
  const openingHour = 8;
  const closingHour = 22;
  const totalHours = closingHour - openingHour;
  const hoursElapsed = Math.max(1, Math.min(hour - openingHour, totalHours));
  const progressRatio = hoursElapsed / totalHours;

  const baseOrders = 248;
  const ordersToday = Math.round(baseOrders * progressRatio + Math.round(Math.random() * 15));
  const grossSales = Math.round(ordersToday * (19500 + Math.round(Math.random() * 3000)));

  return {
    ordersToday,
    ordersChange: +(Math.random() * 15 + 2).toFixed(1),
    onTimeDelivery: +(92 + Math.random() * 6).toFixed(1),
    deliveryChange: +(Math.random() * 5 + 0.5).toFixed(1),
    activeRiders: Math.min(18 + Math.round(Math.random() * 4), 22),
    totalRiders: 22,
    ridersOnlineChange: Math.round(Math.random() * 5 + 1),
    grossSales,
    salesChange: +(Math.random() * 12 + 1).toFixed(1),
  };
}

export const mockDailySummary = generateTodaySummary();
