export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "assigned"
  | "on_the_way"
  | "delivered"
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
}

export interface Notification {
  id: string;
  type: "order" | "rider" | "system" | "delivery";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
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
