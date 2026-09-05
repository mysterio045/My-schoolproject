"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Bike,
  Zap,
  UtensilsCrossed,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Circle,
  LogOut,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { getInitials, cn } from "@/lib/utils";

const mainNav = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Riders", href: "/admin/riders", icon: Bike },
  { label: "Dispatch", href: "/admin/dispatch", icon: Zap },
];

const managementNav = [
  { label: "Menu", href: "/admin/menu", icon: UtensilsCrossed },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
];

const systemNav = [
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

interface SidebarLinkProps {
  href: string;
  label: string;
  icon: React.ElementType;
  collapsed?: boolean;
  onClick?: () => void;
}

function SidebarLink({ href, label, icon: Icon, collapsed, onClick }: SidebarLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-[var(--sidebar-accent)] text-[var(--foreground)]"
          : "text-[var(--muted-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--foreground)]",
        collapsed && "justify-center px-2"
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function NavSection({ title, collapsed, children }: { title: string; collapsed?: boolean; children: React.ReactNode }) {
  if (collapsed) return <>{children}</>;
  return (
    <div>
      <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useApp();
  const { user, logout } = useAuth();
  const displayName = user?.name ?? "Administrator";

  const sidebarContent = (
    <>
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-4">
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-bold tracking-tight text-[var(--foreground)]">HASINAH</p>
              <p className="text-[10px] font-medium text-[var(--muted-foreground)]">Confectionery & Restaurant</p>
            </div>
          )}
          <button
            onClick={() => {
              if (mobileMenuOpen) setMobileMenuOpen(false);
              else toggleSidebar();
            }}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--foreground)] transition-colors"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="flex lg:hidden h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--foreground)] transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <NavSection title="Main" collapsed={sidebarCollapsed}>
            {mainNav.map((item) => (
              <SidebarLink
                key={item.href}
                {...item}
                collapsed={sidebarCollapsed}
                onClick={() => setMobileMenuOpen(false)}
              />
            ))}
          </NavSection>

          <NavSection title="Management" collapsed={sidebarCollapsed}>
            {managementNav.map((item) => (
              <SidebarLink
                key={item.href}
                {...item}
                collapsed={sidebarCollapsed}
                onClick={() => setMobileMenuOpen(false)}
              />
            ))}
          </NavSection>

          <NavSection title="System" collapsed={sidebarCollapsed}>
            {systemNav.map((item) => (
              <SidebarLink
                key={item.href}
                {...item}
                collapsed={sidebarCollapsed}
                onClick={() => setMobileMenuOpen(false)}
              />
            ))}
          </NavSection>
        </nav>

        {/* Admin profile */}
        <div className="border-t border-[var(--border)] px-3 py-3">
          <div className={cn("flex items-center gap-3", sidebarCollapsed && "justify-center")}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[11px] font-semibold text-[var(--primary-foreground)]">
              {getInitials(displayName)}
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-[var(--foreground)] truncate">{displayName}</p>
                  <div className="flex items-center gap-1.5">
                    <Circle className="h-1.5 w-1.5 fill-green-500 text-green-500" />
                    <span className="text-[11px] text-[var(--muted-foreground)]">Online</span>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--foreground)] transition-colors"
                  aria-label="Log out"
                  title="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
            {sidebarCollapsed && (
              <button
                onClick={logout}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--foreground)] transition-colors"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-30 border-r border-[var(--border)] bg-[var(--sidebar-bg)] transition-all duration-200",
          sidebarCollapsed ? "w-[60px]" : "w-[220px]"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 w-[260px] bg-[var(--sidebar-bg)] border-r border-[var(--border)] transform transition-transform duration-200 lg:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
