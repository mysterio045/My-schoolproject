"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  UtensilsCrossed,
  Pencil,
  ChevronDown,
  FolderOpen,
  Check,
  X,
} from "lucide-react";
import { formatNaira, cn } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import LoadingState from "@/components/ui/LoadingState";
import CreateOrderModal from "@/components/orders/CreateOrderModal";
import { showToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/api/errors";
import {
  getMenuCategories,
  createMenuCategory,
  updateMenuCategory,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  toggleMenuItem,
} from "@/lib/api/menu";
import type { MenuCategoryRecord, MenuItemRecord } from "@/lib/types";

/**
 * Backend menu reads are bounded: page_size is capped at 100 by the API, and
 * the Menu grid has no pagination control. We request up to MAX_MENU_ROWS in a
 * single page (the backend maximum), matching the single-page grid design.
 * Item CREATION validates the category server-side; READ endpoints are public
 * but the auth token is still attached when present.
 */
const MAX_MENU_ROWS = 100;

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
  categoryName: string;
  price: string;
  available: boolean;
}

const emptyForm: FoodFormData = {
  name: "",
  description: "",
  categoryName: "",
  price: "",
  available: true,
};

export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategoryRecord[]>([]);
  const [items, setItems] = useState<MenuItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemRecord | null>(null);
  const [formData, setFormData] = useState<FoodFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [createOrderOpen, setCreateOrderOpen] = useState(false);

  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryDescription, setEditCategoryDescription] = useState("");
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  const categoryNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cat of categories) map[cat.id] = cat.name;
    return map;
  }, [categories]);

  const load = useCallback(async () => {
    try {
      const [cats, page] = await Promise.all([
        getMenuCategories(),
        getMenuItems({
          page: 1,
          page_size: MAX_MENU_ROWS,
          category_id: activeCategoryId ?? undefined,
        }),
      ]);
      setCategories(cats);
      setItems(page.items);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [activeCategoryId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    void load();
  };

  const refreshCategories = useCallback(async () => {
    try {
      setCategories(await getMenuCategories());
    } catch (err) {
      showToast("error", getErrorMessage(err));
    }
  }, []);

  const openAddModal = () => {
    const firstCategory = categories[0];
    setEditingItem(null);
    setFormData({
      ...emptyForm,
      categoryName: firstCategory ? firstCategory.name : "",
    });
    setModalOpen(true);
  };

  const openEditModal = (item: MenuItemRecord) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description ?? "",
      categoryName: categoryNameMap[item.category_id] ?? "",
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

  const handleSaveItem = async () => {
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
    const category = categories.find((c) => c.name === formData.categoryName);
    if (!category) {
      showToast("error", "Please choose a valid category");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        category_id: category.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: Number(formData.price),
        available: formData.available,
      };
      if (editingItem) {
        await updateMenuItem(editingItem.id, payload);
        showToast("success", `${formData.name.trim()} updated successfully`);
      } else {
        await createMenuItem(payload);
        showToast("success", `${formData.name.trim()} added to menu`);
      }
      await load();
      closeModal();
    } catch (err) {
      showToast("error", getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleItem = async (item: MenuItemRecord) => {
    if (togglingId) return;
    setTogglingId(item.id);
    try {
      const updated = await toggleMenuItem(item.id);
      setItems((prev) =>
        prev.map((i) => (i.id === updated.id ? updated : i))
      );
      showToast(
        "success",
        `${updated.name} is now ${updated.available ? "available" : "unavailable"}`
      );
    } catch (err) {
      showToast("error", getErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryName.trim()) {
      showToast("error", "Category name is required");
      return;
    }
    setCategorySubmitting(true);
    try {
      await createMenuCategory({
        name: categoryName.trim(),
        description: categoryDescription.trim() || null,
        sort_order: 0,
      });
      setCategoryName("");
      setCategoryDescription("");
      await refreshCategories();
      showToast("success", "Category added");
    } catch (err) {
      showToast("error", getErrorMessage(err));
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleSaveCategory = async (categoryId: string) => {
    if (!editCategoryName.trim()) {
      showToast("error", "Category name is required");
      return;
    }
    setCategorySubmitting(true);
    try {
      await updateMenuCategory(categoryId, {
        name: editCategoryName.trim(),
        description: editCategoryDescription.trim() || null,
      });
      setEditingCategoryId(null);
      await refreshCategories();
      showToast("success", "Category updated");
    } catch (err) {
      showToast("error", getErrorMessage(err));
    } finally {
      setCategorySubmitting(false);
    }
  };

  const activeCategoryName =
    activeCategoryId === null
      ? "All"
      : categoryNameMap[activeCategoryId] ?? "All";

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
            onClick={() => setCategoriesOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
          >
            <FolderOpen className="h-4 w-4" />
            Manage Categories
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
        <button
          onClick={() => setActiveCategoryId(null)}
          className={cn(
            "whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
            activeCategoryId === null
              ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
              : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() =>
              setActiveCategoryId((prev) => (prev === cat.id ? null : cat.id))
            }
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
              activeCategoryId === cat.id
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && !error ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <LoadingState />
        </div>
      ) : null}

      {/* Error */}
      {!loading && error && items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] py-16">
          <UtensilsCrossed className="h-12 w-12 text-[var(--muted-foreground)] opacity-40" />
          <div className="text-center">
            <p className="text-[14px] font-medium text-[var(--foreground)]">
              Couldn&apos;t load the menu
            </p>
            <p className="text-[12px] text-[var(--muted-foreground)] mt-1 max-w-sm">
              {error}
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      ) : null}

      {/* Empty / Grid */}
      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] py-16">
              <UtensilsCrossed className="h-12 w-12 text-[var(--muted-foreground)] opacity-40" />
              <div className="text-center">
                <p className="text-[14px] font-medium text-[var(--foreground)]">
                  No food items found
                </p>
                <p className="text-[12px] text-[var(--muted-foreground)] mt-1">
                  {activeCategoryId === null
                    ? categories.length === 0
                      ? "Add a category first, then add your first menu item."
                      : "Add your first menu item to get started."
                    : `No items in the "${activeCategoryName}" category.`}
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
              {items.map((item) => {
                const categoryName = categoryNameMap[item.category_id] ?? "Unknown";
                return (
                  <div
                    key={item.id}
                    className="group rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden transition-shadow hover:shadow-md"
                  >
                    {/* Image Placeholder */}
                    <div
                      className={cn(
                        "relative h-40 bg-gradient-to-br flex items-center justify-center",
                        imageColors[categoryName] || "from-gray-500 to-gray-600"
                      )}
                    >
                      <UtensilsCrossed className="h-10 w-10 text-white/70" />
                      {/* Availability Badge */}
                      <div className="absolute top-3 right-3">
                        <button
                          onClick={() => handleToggleItem(item)}
                          disabled={togglingId === item.id}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
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
                            categoryColors[categoryName] ||
                              "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          )}
                        >
                          {categoryName}
                        </span>
                      </div>

                      <p className="text-[12px] text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <p className="text-[15px] font-bold text-[var(--foreground)]">
                          {formatNaira(item.price)}
                        </p>

                        <button
                          onClick={() => openEditModal(item)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
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
                value={formData.categoryName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    categoryName: e.target.value,
                  }))
                }
                className="w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 pr-9 text-[13px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
              >
                {categories.length === 0 ? (
                  <option value="" disabled>
                    No categories yet — add one first
                  </option>
                ) : (
                  categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))
                )}
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
              disabled={submitting}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveItem}
              disabled={submitting}
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Manage Categories Modal */}
      <Modal
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        title="Manage Categories"
      >
        <div className="space-y-4">
          {/* Add Category */}
          <div className="rounded-lg border border-[var(--border)] p-3 space-y-2">
            <p className="text-[12px] font-semibold text-[var(--foreground)]">
              Add Category
            </p>
            <input
              type="text"
              placeholder="Category name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={categoryDescription}
              onChange={(e) => setCategoryDescription(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
            />
            <button
              onClick={handleAddCategory}
              disabled={categorySubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Category
            </button>
          </div>

          {/* Category List */}
          <div className="space-y-2">
            {categories.length === 0 ? (
              <p className="text-[12px] text-[var(--muted-foreground)] text-center py-4">
                No categories yet.
              </p>
            ) : (
              categories.map((cat) =>
                editingCategoryId === cat.id ? (
                  <div
                    key={cat.id}
                    className="rounded-lg border border-[var(--border)] p-3 space-y-2"
                  >
                    <input
                      type="text"
                      value={editCategoryName}
                      onChange={(e) => setEditCategoryName(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
                    />
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={editCategoryDescription}
                      onChange={(e) => setEditCategoryDescription(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSaveCategory(cat.id)}
                        disabled={categorySubmitting}
                        className="inline-flex items-center gap-1 rounded-md bg-[var(--primary)] px-2.5 py-1 text-[12px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCategoryId(null)}
                        disabled={categorySubmitting}
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[var(--foreground)] truncate">
                        {cat.name}
                      </p>
                      {cat.description && (
                        <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                          {cat.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setEditingCategoryId(cat.id);
                        setEditCategoryName(cat.name);
                        setEditCategoryDescription(cat.description ?? "");
                      }}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                      aria-label="Edit category"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              )
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}