"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  Search,
  Bell,
  Menu,
  ChevronRight,
  Sun,
  Moon,
  X,
  ShoppingBag,
  Bike,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
} from "@/lib/api/notifications";
import { getErrorMessage } from "@/lib/api/errors";
import type { NotificationRecord } from "@/lib/types";
import { getInitials, getTimeAgo, cn } from "@/lib/utils";

const breadcrumbMap: Record<string, string> = {
  admin: "Dashboard",
  dashboard: "Dashboard",
  orders: "Orders",
  riders: "Riders",
  dispatch: "Dispatch",
  menu: "Menu",
  customers: "Customers",
  analytics: "Analytics",
  settings: "Settings",
};

const notifIcons: Record<string, React.ElementType> = {
  order: ShoppingBag,
  rider: Bike,
  delivery: CheckCircle,
  system: AlertCircle,
};

/** Bounded page of notifications served by the bell dropdown. */
const NOTIFICATION_PAGE_SIZE = 50;

export default function Topbar() {
  const pathname = usePathname();
  const { setMobileMenuOpen } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const adminId = user?.id ?? null;

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map((s, i) => ({
    label: breadcrumbMap[s] || s,
    href: "/" + segments.slice(0, i + 1).join("/"),
  }));

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  // Keep the unread badge in sync with the backend whenever the session
  // changes (login / page refresh). Reads persist server-side, so a simple
  // fetch on mount reflects the state after any browser refresh.
  const refreshUnreadCount = useCallback(async () => {
    if (!adminId) return;
    try {
      const res = await getUnreadCount("admin", adminId);
      setUnreadCount(res.count);
    } catch {
      // Leave the current count untouched on transient failures.
    }
  }, [adminId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  const loadNotifications = useCallback(async () => {
    if (!adminId) return;
    setNotifLoading(true);
    setNotifError(null);
    try {
      const res = await getNotifications({
        recipient_type: "admin",
        recipient_id: adminId,
        page: 1,
        page_size: NOTIFICATION_PAGE_SIZE,
      });
      setNotifications(res.items);
    } catch (error) {
      setNotifications(null);
      setNotifError(getErrorMessage(error));
    } finally {
      setNotifLoading(false);
    }
  }, [adminId]);

  const handleBellClick = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) {
      void loadNotifications();
      void refreshUnreadCount();
    }
  };

  const handleNotifClick = async (notif: NotificationRecord) => {
    if (notif.read || markingId === notif.id) return;
    setMarkingId(notif.id);
    try {
      await markNotificationRead(notif.id, true);
      setNotifications((list) =>
        list ? list.map((n) => (n.id === notif.id ? { ...n, read: true } : n)) : list
      );
      await refreshUnreadCount();
    } catch {
      // Failed writes leave state untouched; the row stays unread and the
      // backend remains the source of truth on the next refresh.
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-sm px-4 lg:px-6">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="mr-3 flex lg:hidden h-8 w-8 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            <span className={i === breadcrumbs.length - 1 ? "text-[var(--foreground)] font-medium truncate" : "truncate"}>
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-1">
        {/* Search */}
        <div className="relative">
          {searchOpen ? (
            <div className="flex items-center">
              <input
                ref={searchRef}
                type="search"
                placeholder="Search orders, riders, menu..."
                className="h-8 w-48 sm:w-64 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 pr-8 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setSearchOpen(false);
                }}
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleBellClick}
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)] text-[9px] font-bold text-[var(--primary-foreground)]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Notifications</h3>
                <span className="text-[11px] text-[var(--muted-foreground)]">{unreadCount} new</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifLoading && notifications === null ? (
                  <p className="px-4 py-6 text-center text-[12px] text-[var(--muted-foreground)]">
                    Loading notifications…
                  </p>
                ) : notifError && notifications === null ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-[12px] text-[var(--muted-foreground)]">{notifError}</p>
                    <button
                      onClick={() => void loadNotifications()}
                      className="mt-2 text-[12px] font-medium text-[var(--primary)] hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : notifications && notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[12px] text-[var(--muted-foreground)]">
                    No notifications yet.
                  </p>
                ) : (
                  notifications?.map((notif) => {
                    const Icon = notifIcons[notif.type] || Bell;
                    return (
                      <div
                        key={notif.id}
                        onClick={() => void handleNotifClick(notif)}
                        className={cn(
                          "flex gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0 hover:bg-[var(--accent)] transition-colors cursor-pointer",
                          !notif.read && "bg-[var(--accent)]"
                        )}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--muted)]">
                          <Icon className="h-4 w-4 text-[var(--muted-foreground)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-[var(--foreground)] truncate">{notif.title}</p>
                          <p className="text-[12px] text-[var(--muted-foreground)] line-clamp-2">{notif.message}</p>
                          <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{getTimeAgo(notif.created_at)}</p>
                        </div>
                        {!notif.read && (
                          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-[11px] font-semibold text-[var(--primary-foreground)] ml-1"
          title={user?.name ?? "Administrator"}
        >
          {getInitials(user?.name ?? "Administrator")}
        </div>
      </div>
    </header>
  );
}