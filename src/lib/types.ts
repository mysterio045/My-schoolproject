export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "assigned"
  | "on_the_way"
  | "delivered"
  | "completed"
  | "cancelled";

export type RiderStatus = "available" | "busy" | "offline";

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  riderId: string | null;
  riderName: string | null;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
  timeline: TimelineEvent[];
  /**
   * Deterministic display label (e.g. "12 min ago") used instead of computing
   * relative time from the live clock at render time. Prevents server/client
   * hydration mismatches for mock data.
   */
  createdAtLabel?: string;
}

export interface TimelineEvent {
  status: string;
  timestamp: string;
  label: string;
}

export interface Rider {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: RiderStatus;
  currentOrderIds: string[];
  location: { lat: number; lng: number; address: string };
  distanceFromRestaurant: number;
  todayDeliveries: number;
  completedDeliveries: number;
  averageDeliveryTime: number;
  rating: number;
  avatar: string;
  joinedDate: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  available: boolean;
  image: string;
  rating: number;
  orderCount: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  status: "active" | "inactive";
  joinDate: string;
  /**
   * Deterministic display label (e.g. "5 days ago") used instead of computing
   * relative time from the live clock at render time.
   */
  lastOrderDateLabel?: string;
}

export interface Notification {
  id: string;
  type: "order" | "rider" | "system" | "delivery";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  /** Deterministic display label (e.g. "12 min ago") for hydration-safe rendering. */
  timestampLabel?: string;
}

export interface AnalyticsData {
  revenue: { date: string; amount: number }[];
  orders: { date: string; count: number }[];
  popularItems: { name: string; orders: number; revenue: number }[];
  deliveryPerformance: {
    date: string;
    onTime: number;
    late: number;
  }[];
}

export type OrderFilter =
  | "all"
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "assigned"
  | "on_the_way"
  | "delivered"
  | "cancelled";

export interface DashboardRecentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  status: OrderStatus;
  total: number;
  rider_name: string | null;
  created_at: string;
}

export interface DashboardRecentNotification {
  id: string;
  type: "order" | "rider" | "system" | "delivery";
  title: string;
  message: string;
  created_at: string;
}

export interface DashboardSummary {
  total_orders: number;
  total_revenue: number;
  total_customers: number;
  available_riders: number;
  busy_riders: number;
  offline_riders: number;
  pending_orders: number;
  orders_today: number;
  revenue_today: number;
  recent_orders: DashboardRecentOrder[];
  recent_notifications: DashboardRecentNotification[];
}
