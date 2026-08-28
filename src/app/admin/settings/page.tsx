"use client";

import { useState } from "react";
import {
  Store,
  Truck,
  Bell,
  User,
  Lock,
  LogOut,
  Save,
  Phone,
  MapPin,
  Clock,
  Mail,
  Eye,
  EyeOff,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/Toast";

type SettingsTab = "restaurant" | "delivery" | "notifications" | "account";

const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "restaurant", label: "Restaurant Profile", icon: Store },
  { id: "delivery", label: "Delivery Settings", icon: Truck },
  { id: "notifications", label: "Notification Settings", icon: Bell },
  { id: "account", label: "Account", icon: User },
];

interface RestaurantProfile {
  name: string;
  phone: string;
  address: string;
  openingHours: string;
}

interface DeliverySettings {
  standardFee: string;
  expressFee: string;
  radius: string;
  maxPerRider: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  orderNotifications: boolean;
  riderNotifications: boolean;
}

interface AccountProfile {
  adminName: string;
  adminEmail: string;
}

interface PasswordForm {
  current: string;
  newPass: string;
  confirm: string;
}

const initialRestaurant: RestaurantProfile = {
  name: "Hasinah Confectionery & Restaurant",
  phone: "+234 806 000 1111",
  address: "12 Wurno Road, Dutse, Jigawa State",
  openingHours: "8:00 AM - 10:00 PM",
};

const initialDelivery: DeliverySettings = {
  standardFee: "1,500",
  expressFee: "2,000",
  radius: "10",
  maxPerRider: "5",
};

const initialNotifications: NotificationSettings = {
  emailNotifications: true,
  orderNotifications: true,
  riderNotifications: false,
};

const initialAccount: AccountProfile = {
  adminName: "Musa Abubakar",
  adminEmail: "musa@hasinah.com",
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("restaurant");
  const [restaurant, setRestaurant] = useState<RestaurantProfile>(initialRestaurant);
  const [delivery, setDelivery] = useState<DeliverySettings>(initialDelivery);
  const [notifications, setNotifications] = useState<NotificationSettings>(initialNotifications);
  const [account, setAccount] = useState<AccountProfile>(initialAccount);
  const [password, setPassword] = useState<PasswordForm>({
    current: "",
    newPass: "",
    confirm: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSaveRestaurant = () => {
    if (!restaurant.name.trim()) {
      showToast("error", "Restaurant name is required");
      return;
    }
    if (!restaurant.phone.trim()) {
      showToast("error", "Phone number is required");
      return;
    }
    if (!restaurant.address.trim()) {
      showToast("error", "Address is required");
      return;
    }
    showToast("success", "Restaurant profile updated successfully");
  };

  const handleSaveDelivery = () => {
    if (!delivery.standardFee.trim()) {
      showToast("error", "Standard delivery fee is required");
      return;
    }
    if (!delivery.expressFee.trim()) {
      showToast("error", "Express delivery fee is required");
      return;
    }
    if (!delivery.radius.trim()) {
      showToast("error", "Delivery radius is required");
      return;
    }
    if (!delivery.maxPerRider.trim()) {
      showToast("error", "Max deliveries per rider is required");
      return;
    }
    showToast("success", "Delivery settings updated successfully");
  };

  const handleSaveNotifications = () => {
    showToast("success", "Notification settings updated successfully");
  };

  const handleSaveAccount = () => {
    if (!account.adminName.trim()) {
      showToast("error", "Admin name is required");
      return;
    }
    if (!account.adminEmail.trim()) {
      showToast("error", "Admin email is required");
      return;
    }
    showToast("success", "Account profile updated successfully");
  };

  const handleChangePassword = () => {
    if (!password.current) {
      showToast("error", "Current password is required");
      return;
    }
    if (!password.newPass) {
      showToast("error", "New password is required");
      return;
    }
    if (password.newPass.length < 8) {
      showToast("error", "New password must be at least 8 characters");
      return;
    }
    if (password.newPass !== password.confirm) {
      showToast("error", "Passwords do not match");
      return;
    }
    showToast("success", "Password changed successfully");
    setPassword({ current: "", newPass: "", confirm: "" });
  };

  const handleLogout = () => {
    showToast("success", "Logged out successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Settings</h1>
        <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
          Manage your restaurant and account settings.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Restaurant Profile Tab */}
      {activeTab === "restaurant" && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                <Store className="h-[18px] w-[18px]" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                  Restaurant Profile
                </h2>
                <p className="text-[12px] text-[var(--muted-foreground)]">
                  Update your restaurant information and details.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Restaurant Name */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--foreground)]">
                Restaurant Name
              </label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  value={restaurant.name}
                  onChange={(e) =>
                    setRestaurant((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--foreground)]">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <input
                  type="tel"
                  value={restaurant.phone}
                  onChange={(e) =>
                    setRestaurant((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--foreground)]">
                Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
                <textarea
                  rows={2}
                  value={restaurant.address}
                  onChange={(e) =>
                    setRestaurant((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow resize-none"
                />
              </div>
            </div>

            {/* Opening Hours */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--foreground)]">
                Opening Hours
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  value={restaurant.openingHours}
                  onChange={(e) =>
                    setRestaurant((prev) => ({
                      ...prev,
                      openingHours: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
                />
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Format: &quot;8:00 AM - 10:00 PM&quot;
              </p>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end pt-2">
              <button
                onClick={handleSaveRestaurant}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Settings Tab */}
      {activeTab === "delivery" && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Truck className="h-[18px] w-[18px]" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                  Delivery Settings
                </h2>
                <p className="text-[12px] text-[var(--muted-foreground)]">
                  Configure delivery fees, radius, and rider limits.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Delivery Fees */}
            <div>
              <h3 className="text-[13px] font-semibold text-[var(--foreground)] mb-3">
                Delivery Fees
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Standard Fee */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[var(--foreground)]">
                    Standard Delivery Fee
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[var(--muted-foreground)] font-medium">
                      &#8358;
                    </span>
                    <input
                      type="text"
                      value={delivery.standardFee}
                      onChange={(e) =>
                        setDelivery((prev) => ({
                          ...prev,
                          standardFee: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
                    />
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Currently: ₦{delivery.standardFee}
                  </p>
                </div>

                {/* Express Fee */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[var(--foreground)]">
                    Express Delivery Fee
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[var(--muted-foreground)] font-medium">
                      &#8358;
                    </span>
                    <input
                      type="text"
                      value={delivery.expressFee}
                      onChange={(e) =>
                        setDelivery((prev) => ({
                          ...prev,
                          expressFee: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
                    />
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Currently: ₦{delivery.expressFee}
                  </p>
                </div>
              </div>
            </div>

            {/* Delivery Radius */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--foreground)]">
                Delivery Radius
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  value={delivery.radius}
                  onChange={(e) =>
                    setDelivery((prev) => ({ ...prev, radius: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-12 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[var(--muted-foreground)] font-medium">
                  km
                </span>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Maximum distance from restaurant for delivery.
              </p>
            </div>

            {/* Max Active Deliveries */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--foreground)]">
                Maximum Active Deliveries per Rider
              </label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  value={delivery.maxPerRider}
                  onChange={(e) =>
                    setDelivery((prev) => ({
                      ...prev,
                      maxPerRider: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-12 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[var(--muted-foreground)] font-medium">
                  per rider
                </span>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Number of concurrent deliveries a single rider can handle.
              </p>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end pt-2">
              <button
                onClick={handleSaveDelivery}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Settings Tab */}
      {activeTab === "notifications" && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <Bell className="h-[18px] w-[18px]" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                  Notification Settings
                </h2>
                <p className="text-[12px] text-[var(--muted-foreground)]">
                  Control how and when you receive notifications.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Email Notifications */}
            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-[var(--muted-foreground)]" />
                <div>
                  <p className="text-[13px] font-medium text-[var(--foreground)]">
                    Email Notifications
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Receive email alerts for important updates and reports.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifications.emailNotifications}
                onClick={() =>
                  setNotifications((prev) => ({
                    ...prev,
                    emailNotifications: !prev.emailNotifications,
                  }))
                }
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                  notifications.emailNotifications
                    ? "bg-green-500"
                    : "bg-[var(--muted)]"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform",
                    notifications.emailNotifications
                      ? "translate-x-5"
                      : "translate-x-0"
                  )}
                />
              </button>
            </div>

            {/* Order Notifications */}
            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3">
              <div className="flex items-center gap-3">
                <Store className="h-5 w-5 text-[var(--muted-foreground)]" />
                <div>
                  <p className="text-[13px] font-medium text-[var(--foreground)]">
                    Order Notifications
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Get notified for new orders, updates, and cancellations.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifications.orderNotifications}
                onClick={() =>
                  setNotifications((prev) => ({
                    ...prev,
                    orderNotifications: !prev.orderNotifications,
                  }))
                }
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                  notifications.orderNotifications
                    ? "bg-green-500"
                    : "bg-[var(--muted)]"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform",
                    notifications.orderNotifications
                      ? "translate-x-5"
                      : "translate-x-0"
                  )}
                />
              </button>
            </div>

            {/* Rider Notifications */}
            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-[var(--muted-foreground)]" />
                <div>
                  <p className="text-[13px] font-medium text-[var(--foreground)]">
                    Rider Notifications
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Alerts for rider status changes and delivery issues.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifications.riderNotifications}
                onClick={() =>
                  setNotifications((prev) => ({
                    ...prev,
                    riderNotifications: !prev.riderNotifications,
                  }))
                }
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                  notifications.riderNotifications
                    ? "bg-green-500"
                    : "bg-[var(--muted)]"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform",
                    notifications.riderNotifications
                      ? "translate-x-5"
                      : "translate-x-0"
                  )}
                />
              </button>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end pt-3">
              <button
                onClick={handleSaveNotifications}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Tab */}
      {activeTab === "account" && (
        <div className="space-y-5">
          {/* Profile Section */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                  <User className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                    Admin Profile
                  </h2>
                  <p className="text-[12px] text-[var(--muted-foreground)]">
                    Manage your personal account information.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Admin Name */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[var(--foreground)]">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                  <input
                    type="text"
                    value={account.adminName}
                    onChange={(e) =>
                      setAccount((prev) => ({
                        ...prev,
                        adminName: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
                  />
                </div>
              </div>

              {/* Admin Email */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[var(--foreground)]">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                  <input
                    type="email"
                    value={account.adminEmail}
                    onChange={(e) =>
                      setAccount((prev) => ({
                        ...prev,
                        adminEmail: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={handleSaveAccount}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>

          {/* Change Password Section */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                  <Lock className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                    Change Password
                  </h2>
                  <p className="text-[12px] text-[var(--muted-foreground)]">
                    Update your password to keep your account secure.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[var(--foreground)]">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={password.current}
                    onChange={(e) =>
                      setPassword((prev) => ({
                        ...prev,
                        current: e.target.value,
                      }))
                    }
                    placeholder="Enter current password"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-10 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[var(--foreground)]">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={password.newPass}
                    onChange={(e) =>
                      setPassword((prev) => ({
                        ...prev,
                        newPass: e.target.value,
                      }))
                    }
                    placeholder="Enter new password"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-10 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  Must be at least 8 characters long.
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[var(--foreground)]">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={password.confirm}
                    onChange={(e) =>
                      setPassword((prev) => ({
                        ...prev,
                        confirm: e.target.value,
                      }))
                    }
                    placeholder="Confirm new password"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-10 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={handleChangePassword}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
                >
                  <Lock className="h-4 w-4" />
                  Update Password
                </button>
              </div>
            </div>
          </div>

          {/* Logout Section */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <div className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
                    Sign Out
                  </h3>
                  <p className="text-[12px] text-[var(--muted-foreground)]">
                    Sign out of your admin account on this device.
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors self-start"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
