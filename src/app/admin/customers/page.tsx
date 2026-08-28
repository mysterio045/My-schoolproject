"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  ShoppingBag,
  Wallet,
  Clock,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { formatNaira, cn } from "@/lib/utils";
import { Customer } from "@/lib/types";

const ITEMS_PER_PAGE = 8;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function CustomersPage() {
  const { customers, orders } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.status === "active").length;
    const inactive = customers.filter((c) => c.status === "inactive").length;
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    return { total, active, inactive, totalRevenue };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    let result = customers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      );
    }
    return result;
  }, [customers, searchQuery]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders
      .filter((o) => o.customerId === selectedCustomer.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [selectedCustomer, orders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Customers</h1>
        <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
          View and manage your customer base.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-medium text-[var(--muted-foreground)]">Total Customers</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">{stats.total}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--muted)]">
              <Users className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-medium text-[var(--muted-foreground)]">Active</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-green-600 dark:text-green-400">{stats.active}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Clock className="h-[18px] w-[18px] text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-medium text-[var(--muted-foreground)]">Inactive</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-gray-500 dark:text-gray-400">{stats.inactive}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
              <ShoppingBag className="h-[18px] w-[18px] text-gray-500 dark:text-gray-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-medium text-[var(--muted-foreground)]">Total Revenue</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">{formatNaira(stats.totalRevenue)}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]">
              <Wallet className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
        <input
          type="text"
          placeholder="Search customers by name, phone, or email..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] pl-9 pr-4 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Last Order
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-10 w-10 text-[var(--muted-foreground)] opacity-40" />
                      <p className="text-[13px] text-[var(--muted-foreground)]">No customers found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className={cn(
                      "border-b border-[var(--border)] last:border-0 transition-colors cursor-pointer",
                      selectedCustomer?.id === customer.id
                        ? "bg-[var(--accent)]"
                        : "hover:bg-[var(--accent)]/50"
                    )}
                    onClick={() =>
                      setSelectedCustomer(
                        selectedCustomer?.id === customer.id ? null : customer
                      )
                    }
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                          <span className="text-[12px] font-bold">
                            {getInitials(customer.name)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[var(--foreground)] truncate">
                            {customer.name}
                          </p>
                          <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                            {customer.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-[13px] font-medium text-[var(--foreground)]">
                        {customer.totalOrders}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-[13px] font-medium text-[var(--foreground)]">
                        {formatNaira(customer.totalSpent)}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-[12px] text-[var(--muted-foreground)]">
                        {customer.lastOrderDateLabel ?? "Today"}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-medium",
                          customer.status === "active"
                            ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                            : "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                        )}
                      >
                        {customer.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
            <p className="text-[12px] text-[var(--muted-foreground)]">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)} of{" "}
              {filteredCustomers.length} customers
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md text-[12px] font-medium transition-colors",
                    currentPage === page
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                  )}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {paginatedCustomers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] py-12">
            <Users className="h-10 w-10 text-[var(--muted-foreground)] opacity-40" />
            <p className="text-[13px] text-[var(--muted-foreground)]">No customers found</p>
          </div>
        ) : (
          paginatedCustomers.map((customer) => (
            <div
              key={customer.id}
              className={cn(
                "rounded-xl border bg-[var(--card)] p-4 space-y-3 cursor-pointer transition-colors",
                selectedCustomer?.id === customer.id
                  ? "border-[var(--primary)]"
                  : "border-[var(--border)] hover:border-[var(--primary)]/30"
              )}
              onClick={() =>
                setSelectedCustomer(
                  selectedCustomer?.id === customer.id ? null : customer
                )
              }
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                    <span className="text-[12px] font-bold">
                      {getInitials(customer.name)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--foreground)] truncate">
                      {customer.name}
                    </p>
                    <p className="text-[12px] text-[var(--muted-foreground)]">
                      {customer.phone}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-medium shrink-0",
                    customer.status === "active"
                      ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                      : "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                  )}
                >
                  {customer.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-[12px]">
                <div>
                  <p className="text-[var(--muted-foreground)]">Orders</p>
                  <p className="font-medium text-[var(--foreground)]">{customer.totalOrders}</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">Total Spent</p>
                  <p className="font-medium text-[var(--foreground)]">{formatNaira(customer.totalSpent)}</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">Last Order</p>
                  <p className="font-medium text-[var(--foreground)]">{customer.lastOrderDateLabel ?? "Today"}</p>
                </div>
              </div>

              <div className="flex items-center justify-end text-[12px] text-[var(--primary)]">
                <span className="flex items-center gap-1 font-medium">
                  {selectedCustomer?.id === customer.id ? "Hide Details" : "View Details"}
                  <ArrowRight
                    className={cn(
                      "h-3 w-3 transition-transform",
                      selectedCustomer?.id === customer.id && "rotate-90"
                    )}
                  />
                </span>
              </div>
            </div>
          ))
        )}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <p className="text-[12px] text-[var(--muted-foreground)]">
              {currentPage} / {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Detail Panel */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedCustomer(null)}
          />

          {/* Panel */}
          <div className="relative z-10 w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
            {/* Close button */}
            <button
              onClick={() => setSelectedCustomer(null)}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Profile Section */}
            <div className="p-6 pb-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                  <span className="text-lg font-bold">
                    {getInitials(selectedCustomer.name)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-[var(--foreground)]">
                    {selectedCustomer.name}
                  </h2>
                  <p className="text-[13px] text-[var(--muted-foreground)]">
                    {selectedCustomer.id}
                  </p>
                  <div className="mt-1">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-medium",
                        selectedCustomer.status === "active"
                          ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                          : "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                      )}
                    >
                      {selectedCustomer.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="px-6 pb-4">
              <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted-foreground)]">Phone</p>
                    <p className="text-[13px] text-[var(--foreground)] truncate">
                      {selectedCustomer.phone}
                    </p>
                  </div>
                </div>
                <div className="border-t border-[var(--border)]" />
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted-foreground)]">Email</p>
                    <p className="text-[13px] text-[var(--foreground)] truncate">
                      {selectedCustomer.email}
                    </p>
                  </div>
                </div>
                <div className="border-t border-[var(--border)]" />
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted-foreground)]">Address</p>
                    <p className="text-[13px] text-[var(--foreground)] truncate">
                      {selectedCustomer.address}
                    </p>
                  </div>
                </div>
                <div className="border-t border-[var(--border)]" />
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted-foreground)]">Joined</p>
                    <p className="text-[13px] text-[var(--foreground)]">
                      {new Date(selectedCustomer.joinDate).toLocaleDateString("en-NG", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="px-6 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                  <p className="text-[11px] text-[var(--muted-foreground)]">Total Orders</p>
                  <p className="mt-0.5 text-xl font-bold text-[var(--foreground)]">
                    {selectedCustomer.totalOrders}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                  <p className="text-[11px] text-[var(--muted-foreground)]">Total Spent</p>
                  <p className="mt-0.5 text-xl font-bold text-[var(--foreground)]">
                    {formatNaira(selectedCustomer.totalSpent)}
                  </p>
                </div>
              </div>
            </div>

            {/* Order History */}
            <div className="px-6 pb-6">
              <h3 className="text-[13px] font-semibold text-[var(--foreground)] mb-3">
                Recent Orders
              </h3>
              {customerOrders.length === 0 ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] py-8 text-center">
                  <ShoppingBag className="h-8 w-8 mx-auto text-[var(--muted-foreground)] opacity-40 mb-2" />
                  <p className="text-[13px] text-[var(--muted-foreground)]">
                    No orders from this customer yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customerOrders.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-[var(--foreground)]">
                          {order.id}
                        </p>
                        <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                          {order.items.length} item{order.items.length > 1 ? "s" : ""} —{" "}
                          {order.createdAtLabel ?? "Just now"}
                        </p>
                      </div>
                      <div className="ml-3 shrink-0">
                        <p className="text-[13px] font-semibold text-[var(--foreground)]">
                          {formatNaira(order.total)}
                        </p>
                        <p
                          className={cn(
                            "text-[11px] font-medium text-right",
                            order.status === "delivered"
                              ? "text-green-600 dark:text-green-400"
                              : order.status === "cancelled"
                                ? "text-red-600 dark:text-red-400"
                                : "text-[var(--muted-foreground)]"
                          )}
                        >
                          {order.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </p>
                      </div>
                    </div>
                  ))}
                  {customerOrders.length > 5 && (
                    <p className="text-center text-[12px] text-[var(--muted-foreground)] pt-1">
                      +{customerOrders.length - 5} more orders
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
