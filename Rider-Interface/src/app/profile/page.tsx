"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Bike,
  CreditCard,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { updateRiderAvailability } from "@/lib/api";
import BottomNav from "@/components/BottomNav";

export default function ProfilePage() {
  const router = useRouter();
  const { rider, logout, refreshProfile } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!rider) {
    router.push("/login");
    return null;
  }

  const isOnline = rider.status === "available";

  const handleToggleOnline = async () => {
    setIsUpdating(true);
    try {
      const newStatus = isOnline ? "offline" : "available";
      await updateRiderAvailability({ status: newStatus });
      await refreshProfile();
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0c13] pb-20">
      <div className="bg-white dark:bg-[#0f1117] px-5 pt-12 pb-6 border-b border-gray-100 dark:border-[#2a2d37]">
        <div className="flex items-center gap-3">
          <Link
            href="/home"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-[#1a1d27] hover:bg-gray-100 dark:hover:bg-[#22252f] transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Profile</h1>
        </div>
      </div>

      <div className="px-5 pt-6 space-y-5">
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2d37] shadow-sm text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl font-bold text-green-700 dark:text-green-300">
              {rider.first_name[0]}
              {rider.last_name[0]}
            </span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {rider.first_name} {rider.last_name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Rider ID: #{rider.id.slice(0, 8)}
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs font-medium text-green-600 dark:text-green-400">
              Verified Rider
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-[#2a2d37] shadow-sm overflow-hidden">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 px-5 pt-4 pb-2 uppercase tracking-wider">
            Contact Information
          </h3>
          <div className="divide-y divide-gray-100 dark:divide-[#2a2d37]">
            <div className="flex items-center gap-3 px-5 py-3.5">
              <Phone size={18} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">{rider.phone}</p>
              </div>
              <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5">
              <Mail size={18} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                  {rider.email}
                </p>
              </div>
              <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-[#2a2d37] shadow-sm overflow-hidden">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 px-5 pt-4 pb-2 uppercase tracking-wider">
            Vehicle Information
          </h3>
          <div className="divide-y divide-gray-100 dark:divide-[#2a2d37]">
            <div className="flex items-center gap-3 px-5 py-3.5">
              <Bike size={18} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">Vehicle Type</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 capitalize">
                  {rider.vehicle_type || "Not specified"}
                </p>
              </div>
              <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5">
              <CreditCard size={18} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">Plate Number</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                  {rider.vehicle_plate_number || "Not specified"}
                </p>
              </div>
              <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2d37] shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wider">
            Availability
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {isOnline ? "Online" : "Offline"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {isOnline
                  ? "You are accepting delivery orders."
                  : "You are not accepting new orders."}
              </p>
            </div>
            <button
              onClick={handleToggleOnline}
              disabled={isUpdating}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-[#1a1d27] ${
                isOnline ? "bg-green-600" : "bg-gray-300 dark:bg-gray-600"
              } ${isUpdating ? "opacity-60 cursor-not-allowed" : ""}`}
              role="switch"
              aria-checked={isOnline}
              aria-label={isOnline ? "Go offline" : "Go online"}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isOnline ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-white dark:bg-[#1a1d27] rounded-2xl p-4 border border-red-100 dark:border-red-900/50 shadow-sm flex items-center justify-center gap-2 text-red-600 dark:text-red-400 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors mb-4"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
