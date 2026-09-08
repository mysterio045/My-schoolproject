"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cycle = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  if (!mounted) {
    return (
      <button
        className="fixed top-3 right-3 z-[60] w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-[#1a1d27] border border-gray-200 dark:border-[#2a2d37] shadow-sm text-gray-600 dark:text-gray-400"
        aria-label="Switch theme"
        disabled
      >
        <Monitor size={17} strokeWidth={1.8} />
      </button>
    );
  }

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <button
      onClick={cycle}
      className="fixed top-3 right-3 z-[60] w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-[#1a1d27] border border-gray-200 dark:border-[#2a2d37] shadow-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#22252f] transition-colors"
      aria-label={`Switch theme (current: ${theme})`}
    >
      <Icon size={17} strokeWidth={1.8} />
    </button>
  );
}
