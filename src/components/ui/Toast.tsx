"use client";

import { useEffect, useState } from "react";
import { CheckCircle, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastMessage {
  id: string;
  type: "success" | "error";
  message: string;
}

let toastListeners: ((msg: ToastMessage) => void)[] = [];

let toastCounter = 0;

export function showToast(type: "success" | "error", message: string) {
  const msg: ToastMessage = { id: `${Date.now()}-${++toastCounter}`, type, message };
  toastListeners.forEach((fn) => fn(msg));
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (msg: ToastMessage) => {
      setToasts((prev) => [...prev, msg]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== msg.id));
      }, 3500);
    };
    toastListeners.push(handler);
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== handler);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg min-w-[280px] animate-in slide-in-from-right",
            t.type === "success"
              ? "bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800"
              : "bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800"
          )}
        >
          {t.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          )}
          <p className="text-[13px] font-medium text-[var(--foreground)] flex-1">{t.message}</p>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
