"use client";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ToastContainer from "@/components/ui/Toast";
import { AppProvider } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

function AdminShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useApp();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Sidebar />
      <div
        className={cn(
          "transition-all duration-200",
          sidebarCollapsed ? "lg:ml-[60px]" : "lg:ml-[220px]"
        )}
      >
        <Topbar />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
      <ToastContainer />
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <AdminShell>{children}</AdminShell>
    </AppProvider>
  );
}
