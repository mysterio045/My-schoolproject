"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Order, Rider, MenuItem, Customer, OrderItem } from "@/lib/types";
import { mockOrders } from "@/lib/mock-data/orders";
import { mockRiders } from "@/lib/mock-data/riders";
import { mockMenu } from "@/lib/mock-data/menu";
import { mockCustomers } from "@/lib/mock-data/customers";

interface AppContextType {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  riders: Rider[];
  setRiders: React.Dispatch<React.SetStateAction<Rider[]>>;
  menu: MenuItem[];
  setMenu: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  customers: Customer[];
  createOrder: (data: {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    items: OrderItem[];
  }) => Order;
  assignRider: (orderId: string, riderId: string) => void;
  completeDelivery: (orderId: string) => void;
  updateOrderStatus: (orderId: string, status: Order["status"]) => void;
  toggleMenuAvailability: (itemId: string) => void;
  addMenuItem: (item: MenuItem) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

let orderCounter = 1025;

export function AppProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [riders, setRiders] = useState<Rider[]>(mockRiders);
  const [menu, setMenu] = useState<MenuItem[]>(mockMenu);
  const [customers] = useState<Customer[]>(mockCustomers);

  const toggleSidebar = () => setSidebarCollapsed((p) => !p);

  const createOrder = useCallback(
    (data: {
      customerName: string;
      customerPhone: string;
      deliveryAddress: string;
      items: OrderItem[];
    }) => {
      const id = `ORD-${orderCounter++}`;
      const now = new Date().toISOString();
      const subtotal = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const deliveryFee = subtotal >= 10000 ? 1000 : 1500;
      const total = subtotal + deliveryFee;

      const newOrder: Order = {
        id,
        customerId: `C-${Date.now()}`,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        deliveryAddress: data.deliveryAddress,
        items: data.items,
        subtotal,
        deliveryFee,
        total,
        status: "pending",
        riderId: null,
        riderName: null,
        createdAt: now,
        updatedAt: now,
        timeline: [{ status: "pending", timestamp: now, label: "Order Placed" }],
      };

      setOrders((prev) => [newOrder, ...prev]);
      return newOrder;
    },
    []
  );

  const assignRider = useCallback(
    (orderId: string, riderId: string) => {
      const rider = riders.find((r) => r.id === riderId);
      if (!rider) return;
      const now = new Date().toISOString();

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "assigned" as const,
                riderId: rider.id,
                riderName: rider.name,
                updatedAt: now,
                timeline: [
                  ...o.timeline,
                  { status: "assigned", timestamp: now, label: "Rider Assigned" },
                ],
              }
            : o
        )
      );

      setRiders((prev) =>
        prev.map((r) =>
          r.id === riderId
            ? {
                ...r,
                status: "busy" as const,
                currentOrderIds: [...r.currentOrderIds, orderId],
              }
            : r
        )
      );
    },
    [riders]
  );

  const completeDelivery = useCallback(
    (orderId: string) => {
      const now = new Date().toISOString();

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "delivered" as const,
                updatedAt: now,
                timeline: [
                  ...o.timeline,
                  { status: "delivered", timestamp: now, label: "Delivered" },
                ],
              }
            : o
        )
      );

      setRiders((prev) =>
        prev.map((r) => {
          if (!r.currentOrderIds.includes(orderId)) return r;
          const remaining = r.currentOrderIds.filter((id) => id !== orderId);
          return {
            ...r,
            currentOrderIds: remaining,
            status: remaining.length === 0 ? ("available" as const) : ("busy" as const),
            todayDeliveries: r.todayDeliveries + 1,
            completedDeliveries: r.completedDeliveries + 1,
          };
        })
      );
    },
    []
  );

  const updateOrderStatus = useCallback(
    (orderId: string, status: Order["status"]) => {
      const now = new Date().toISOString();
      const label = status
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status,
                updatedAt: now,
                timeline: [
                  ...o.timeline,
                  { status, timestamp: now, label },
                ],
              }
            : o
        )
      );
    },
    []
  );

  const toggleMenuAvailability = (itemId: string) => {
    setMenu((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, available: !item.available } : item
      )
    );
  };

  const addMenuItem = (item: MenuItem) => {
    setMenu((prev) => [...prev, item]);
  };

  return (
    <AppContext.Provider
      value={{
        sidebarCollapsed,
        toggleSidebar,
        mobileMenuOpen,
        setMobileMenuOpen,
        orders,
        setOrders,
        riders,
        setRiders,
        menu,
        setMenu,
        customers,
        createOrder,
        assignRider,
        completeDelivery,
        updateOrderStatus,
        toggleMenuAvailability,
        addMenuItem,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    return {
      sidebarCollapsed: false,
      toggleSidebar: () => {},
      mobileMenuOpen: false,
      setMobileMenuOpen: () => {},
      orders: [],
      setOrders: () => {},
      riders: [],
      setRiders: () => {},
      menu: [],
      setMenu: () => {},
      customers: [],
      createOrder: () => ({} as Order),
      assignRider: () => {},
      completeDelivery: () => {},
      updateOrderStatus: () => {},
      toggleMenuAvailability: () => {},
      addMenuItem: () => {},
    };
  }
  return ctx;
}
