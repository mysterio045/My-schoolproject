"use client";

import { useState } from "react";
import { Minus, Plus, Trash2, ShoppingCart, MapPin, Star, Check } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useApp } from "@/context/AppContext";
import { formatNaira, cn } from "@/lib/utils";
import { OrderItem, MenuItem, Order } from "@/lib/types";
import { showToast } from "@/components/ui/Toast";

interface CartItem extends OrderItem {
  available: boolean;
}

interface CreateOrderModalProps {
  open: boolean;
  onClose: () => void;
  onOrderCreated?: (orderId: string) => void;
}

export default function CreateOrderModal({ open, onClose, onOrderCreated }: CreateOrderModalProps) {
  const { menu, createOrder, riders, assignRider } = useApp();
  const [step, setStep] = useState<"details" | "menu" | "assign">("details");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);

  const categories = ["All", ...new Set(menu.filter((m) => m.available).map((m) => m.category))];

  const filteredMenu = menu.filter((item) => {
    if (!item.available) return false;
    if (selectedCategory !== "All" && item.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    }
    return true;
  });

  const availableRiders = riders
    .filter((r) => r.status === "available")
    .sort((a, b) => a.distanceFromRestaurant - b.distanceFromRestaurant);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { id: item.id, name: item.name, quantity: 1, price: item.price, available: item.available }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((c) =>
          c.id === itemId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0);
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.id !== itemId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal >= 10000 ? 1000 : 1500;
  const total = subtotal + deliveryFee;

  const canProceedToMenu = customerName.trim() && customerPhone.trim() && deliveryAddress.trim();
  const canPlaceOrder = cart.length > 0;

  const handlePlaceOrder = () => {
    if (!canPlaceOrder) return;

    const order = createOrder({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      items: cart.map(({ available, ...rest }) => rest),
    });

    setCreatedOrder(order);
    setStep("assign");
    showToast("success", `Order ${order.id} created successfully`);
  };

  const handleAssignRider = () => {
    if (!createdOrder || !selectedRiderId) return;

    assignRider(createdOrder.id, selectedRiderId);
    const rider = riders.find((r) => r.id === selectedRiderId);
    showToast("success", `Rider ${rider?.name} assigned to ${createdOrder.id}`);
    onOrderCreated?.(createdOrder.id);
    handleClose();
  };

  const handleSkipAssignment = () => {
    if (createdOrder) {
      onOrderCreated?.(createdOrder.id);
    }
    handleClose();
  };

  const handleClose = () => {
    setStep("details");
    setCustomerName("");
    setCustomerPhone("");
    setDeliveryAddress("");
    setCart([]);
    setSearchQuery("");
    setSelectedCategory("All");
    setCreatedOrder(null);
    setSelectedRiderId(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create Food Order" className="max-w-2xl">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-5">
        {[
          { key: "details", label: "Customer Info" },
          { key: "menu", label: "Select Items" },
          { key: "assign", label: "Assign Rider" },
        ].map((s, i) => {
          const isActive = step === s.key;
          const isCompleted =
            (s.key === "details" && (step === "menu" || step === "assign")) ||
            (s.key === "menu" && step === "assign");
          return (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px bg-[var(--border)]" />}
              <div
                className={cn(
                  "flex items-center gap-1.5 text-[12px] font-medium",
                  isActive ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isActive
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                  )}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Customer Details */}
      {step === "details" && (
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--foreground)] mb-1.5">
              Customer Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Aisha Bello"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--foreground)] mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="e.g. +234 806 123 4567"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--foreground)] mb-1.5">
              Delivery Address
            </label>
            <textarea
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="e.g. 12 Wurno Road, Dutse, Jigawa State"
              rows={2}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)] resize-none"
            />
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep("menu")}
              disabled={!canProceedToMenu}
              className={cn(
                "rounded-lg px-4 py-2 text-[13px] font-medium transition-colors",
                canProceedToMenu
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed"
              )}
            >
              Select Items
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Menu Selection */}
      {step === "menu" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("details")}
              className="text-[12px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              &larr; Back
            </button>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menu..."
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                  selectedCategory === cat
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[250px] overflow-y-auto">
            {filteredMenu.map((item) => {
              const inCart = cart.find((c) => c.id === item.id);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3 hover:bg-[var(--accent)]/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[var(--foreground)] truncate">{item.name}</p>
                    <p className="text-[11px] text-[var(--muted-foreground)]">{item.category}</p>
                    <p className="text-[12px] font-semibold text-[var(--foreground)] mt-0.5">
                      {formatNaira(item.price)}
                    </p>
                  </div>
                  {inCart ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--accent)]"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center text-[13px] font-medium text-[var(--foreground)]">
                        {inCart.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--accent)]"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(item)}
                      className="shrink-0 rounded-md bg-[var(--muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
                    >
                      Add
                    </button>
                  )}
                </div>
              );
            })}
            {filteredMenu.length === 0 && (
              <p className="col-span-2 py-6 text-center text-[13px] text-[var(--muted-foreground)]">
                No items found
              </p>
            )}
          </div>

          {/* Cart Summary */}
          {cart.length > 0 && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                <span className="text-[12px] font-semibold text-[var(--foreground)]">
                  {cart.length} item{cart.length > 1 ? "s" : ""} in order
                </span>
              </div>
              <div className="space-y-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-[12px]">
                    <span className="text-[var(--foreground)]">
                      {item.name} x{item.quantity}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--foreground)]">{formatNaira(item.price * item.quantity)}</span>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-[var(--muted-foreground)] hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 border-t border-[var(--border)] pt-2 space-y-0.5">
                <div className="flex justify-between text-[12px]">
                  <span className="text-[var(--muted-foreground)]">Subtotal</span>
                  <span className="text-[var(--foreground)]">{formatNaira(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[var(--muted-foreground)]">Delivery</span>
                  <span className="text-[var(--foreground)]">{formatNaira(deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-[13px] font-semibold">
                  <span className="text-[var(--foreground)]">Total</span>
                  <span className="text-[var(--foreground)]">{formatNaira(total)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={handlePlaceOrder}
              disabled={!canPlaceOrder}
              className={cn(
                "rounded-lg px-4 py-2 text-[13px] font-medium transition-colors",
                canPlaceOrder
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed"
              )}
            >
              Place Order &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Assign Rider */}
      {step === "assign" && createdOrder && (
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 p-3">
            <p className="text-[13px] font-semibold text-[var(--foreground)] mb-1">
              {createdOrder.id} &mdash; {formatNaira(createdOrder.total)}
            </p>
            <p className="text-[12px] text-[var(--muted-foreground)]">
              {createdOrder.items.length} item{createdOrder.items.length > 1 ? "s" : ""} &bull; {createdOrder.customerName}
            </p>
          </div>

          {availableRiders.length > 0 ? (
            <>
              <p className="text-[13px] font-medium text-[var(--foreground)]">
                Available Riders ({availableRiders.length})
              </p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {availableRiders.map((rider) => (
                  <button
                    key={rider.id}
                    onClick={() => setSelectedRiderId(rider.id === selectedRiderId ? null : rider.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      selectedRiderId === rider.id
                        ? "border-[var(--primary)] bg-[var(--accent)]"
                        : "border-[var(--border)] hover:bg-[var(--accent)]/50"
                    )}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[11px] font-bold text-[var(--primary-foreground)]">
                      {rider.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium text-[var(--foreground)]">{rider.name}</p>
                        {selectedRiderId === rider.id && (
                          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]">
                          <MapPin className="h-3 w-3" />
                          {rider.distanceFromRestaurant} km
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]">
                          <Star className="h-3 w-3" />
                          {rider.rating}
                        </span>
                        <span className="text-[11px] text-[var(--muted-foreground)]">
                          {rider.todayDeliveries} deliveries today
                        </span>
                      </div>
                    </div>
                    {rider.currentOrderIds.length > 0 && (
                      <span className="shrink-0 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 px-2 py-0.5 text-[10px] font-medium">
                        {rider.currentOrderIds.length} active
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="text-[13px] text-[var(--muted-foreground)]">
                No available riders at the moment.
              </p>
              <p className="text-[12px] text-[var(--muted-foreground)] mt-1">
                You can assign a rider later from the Dispatch page.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleSkipAssignment}
              className="rounded-lg px-4 py-2 text-[13px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Skip for now
            </button>
            <button
              onClick={handleAssignRider}
              disabled={!selectedRiderId}
              className={cn(
                "rounded-lg px-4 py-2 text-[13px] font-medium transition-colors",
                selectedRiderId
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed"
              )}
            >
              Assign Rider
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
