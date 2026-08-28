"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  UtensilsCrossed,
  Pencil,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { mockCategories } from "@/lib/mock-data";
import { formatNaira, cn } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import CreateOrderModal from "@/components/orders/CreateOrderModal";
import { showToast } from "@/components/ui/Toast";
import { MenuItem } from "@/lib/types";

const allCategories = ["All", ...mockCategories];

const categoryColors: Record<string, string> = {
  "Main Meals": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Rice: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Snacks: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Pastries: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  Drinks: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Desserts: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

const imageColors: Record<string, string> = {
  "Main Meals": "from-amber-500 to-orange-600",
  Rice: "from-orange-500 to-red-600",
  Snacks: "from-emerald-500 to-teal-600",
  Pastries: "from-pink-500 to-rose-600",
  Drinks: "from-blue-500 to-cyan-600",
  Desserts: "from-violet-500 to-purple-600",
};

interface FoodFormData {
  name: string;
  description: string;
  category: string;
  price: string;
  available: boolean;
}

const emptyForm: FoodFormData = {
  name: "",
  description: "",
  category: "Main Meals",
  price: "",
  available: true,
};

export default function MenuPage() {
  const { menu, setMenu, toggleMenuAvailability, addMenuItem } = useApp();
  const [activeCategory, setActiveCategory] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<FoodFormData>(emptyForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);

  const filteredMenu = useMemo(() => {
    if (activeCategory === "All") return menu;
    return menu.filter((item) => item.category === activeCategory);
  }, [menu, activeCategory]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      category: item.category,
      price: item.price.toString(),
      available: item.available,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setFormData(emptyForm);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      showToast("error", "Food name is required");
      return;
    }
    if (!formData.description.trim()) {
      showToast("error", "Description is required");
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      showToast("error", "Please enter a valid price");
      return;
    }

    if (editingItem) {
      setMenu((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                name: formData.name.trim(),
                description: formData.description.trim(),
                category: formData.category,
                price: Number(formData.price),
                available: formData.available,
              }
            : item
        )
      );
      showToast("success", `${formData.name} updated successfully`);
    } else {
      const newItem: MenuItem = {
        id: `F-${Date.now()}`,
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        price: Number(formData.price),
        available: formData.available,
        image: "",
        rating: 0,
        orderCount: 0,
      };
      addMenuItem(newItem);
      showToast("success", `${formData.name} added to menu`);
    }

    closeModal();
  };

  const handleDelete = (item: MenuItem) => {
    setMenu((prev) => prev.filter((i) => i.id !== item.id));
    setDeletingId(null);
    showToast("success", `${item.name} removed from menu`);
  };

  const handleToggle = (itemId: string) => {
    toggleMenuAvailability(itemId);
    const item = menu.find((i) => i.id === itemId);
    if (item) {
      showToast(
        "success",
        `${item.name} is now ${item.available ? "unavailable" : "available"}`
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Menu</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
            Manage your restaurant&apos;s food and availability.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => setCreateOrderOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
          >
            Create Order
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Add Food
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {allCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
              activeCategory === cat
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Food Grid */}
      {filteredMenu.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] py-16">
          <UtensilsCrossed className="h-12 w-12 text-[var(--muted-foreground)] opacity-40" />
          <div className="text-center">
            <p className="text-[14px] font-medium text-[var(--foreground)]">
              No food items found
            </p>
            <p className="text-[12px] text-[var(--muted-foreground)] mt-1">
              {activeCategory === "All"
                ? "Add your first menu item to get started."
                : `No items in the "${activeCategory}" category.`}
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Food
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMenu.map((item) => (
            <div
              key={item.id}
              className="group rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden transition-shadow hover:shadow-md"
            >
              {/* Image Placeholder */}
              <div
                className={cn(
                  "relative h-40 bg-gradient-to-br flex items-center justify-center",
                  imageColors[item.category] || "from-gray-500 to-gray-600"
                )}
              >
                <UtensilsCrossed className="h-10 w-10 text-white/70" />
                {/* Availability Badge */}
                <div className="absolute top-3 right-3">
                  <button
                    onClick={() => handleToggle(item.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm transition-colors",
                      item.available
                        ? "bg-green-500/20 text-green-100 hover:bg-green-500/30"
                        : "bg-red-500/20 text-red-100 hover:bg-red-500/30"
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        item.available ? "bg-green-400" : "bg-red-400"
                      )}
                    />
                    {item.available ? "Available" : "Unavailable"}
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[14px] font-semibold text-[var(--foreground)] leading-tight">
                      {item.name}
                    </h3>
                  </div>
                  <span
                    className={cn(
                      "inline-block rounded-md px-2 py-0.5 text-[10px] font-medium",
                      categoryColors[item.category] ||
                        "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    )}
                  >
                    {item.category}
                  </span>
                </div>

                <p className="text-[12px] text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[15px] font-bold text-[var(--foreground)]">
                    {formatNaira(item.price)}
                  </p>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(item)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingId(item.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingItem ? "Edit Food Item" : "Add Food Item"}
      >
        <div className="space-y-4">
          {/* Food Name */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[var(--foreground)]">
              Food Name
            </label>
            <input
              type="text"
              placeholder="e.g. Jollof Rice"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[var(--foreground)]">
              Description
            </label>
            <textarea
              placeholder="Brief description of the food..."
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow resize-none"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[var(--foreground)]">
              Category
            </label>
            <div className="relative">
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                className="w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 pr-9 text-[13px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
              >
                {mockCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
            </div>
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[var(--foreground)]">
              Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[var(--muted-foreground)] font-medium">
                &#8358;
              </span>
              <input
                type="number"
                placeholder="0"
                min="0"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, price: e.target.value }))
                }
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
              />
            </div>
          </div>

          {/* Available Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2.5">
            <div>
              <p className="text-[13px] font-medium text-[var(--foreground)]">
                Available for Order
              </p>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Toggle if this item is in stock
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={formData.available}
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  available: !prev.available,
                }))
              }
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                formData.available ? "bg-green-500" : "bg-[var(--muted)]"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform",
                  formData.available ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={closeModal}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
            >
              {editingItem ? "Save Changes" : "Add Food"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Order Modal */}
      <CreateOrderModal
        open={createOrderOpen}
        onClose={() => setCreateOrderOpen(false)}
        onOrderCreated={() => {
          showToast("success", "Order created successfully");
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title="Delete Food Item"
      >
        <div className="space-y-4">
          <p className="text-[13px] text-[var(--muted-foreground)] leading-relaxed">
            Are you sure you want to delete{" "}
            <span className="font-medium text-[var(--foreground)]">
              {menu.find((i) => i.id === deletingId)?.name}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setDeletingId(null)}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const item = menu.find((i) => i.id === deletingId);
                if (item) handleDelete(item);
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
