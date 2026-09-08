export type DeliveryStatus =
  | "assigned"
  | "preparing"
  | "ready_for_pickup"
  | "picked_up"
  | "delivered"
  | "cancelled";

export type VehicleType = "motorcycle" | "bicycle";

export type DocumentStatus = "verified" | "pending" | "expired" | "not_submitted";

export interface Rider {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  vehicleType: VehicleType;
  vehiclePlate: string;
  rating: number;
  isOnline: boolean;
  documents: {
    identity: DocumentStatus;
    license: DocumentStatus;
    vehicle: DocumentStatus;
  };
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  latitude: number;
  longitude: number;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  status: DeliveryStatus;
  restaurant: Restaurant;
  customer: Customer;
  deliveryAddress: string;
  items: OrderItem[];
  deliveryFee: number;
  pickupDistance: number;
  dropoffDistance: number;
  deliveryNotes: string;
  assignedAt: string;
  preparingAt?: string;
  readyAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  totalAmount: number;
}

export interface RiderMetrics {
  todayDeliveries: number;
  todayEarnings: number;
  rating: number;
  acceptanceRate: number;
}
