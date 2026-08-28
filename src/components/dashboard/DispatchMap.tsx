"use client";

import { MapPin, Bike, Navigation } from "lucide-react";
import { useApp } from "@/context/AppContext";

const riderPositions = [
  { x: 25, y: 30, status: "available" as const },
  { x: 60, y: 20, status: "busy" as const },
  { x: 40, y: 55, status: "available" as const },
  { x: 75, y: 45, status: "busy" as const },
  { x: 30, y: 70, status: "available" as const },
];

const deliveryPositions = [
  { x: 50, y: 40 },
  { x: 70, y: 65 },
  { x: 20, y: 50 },
];

export default function DispatchMap() {
  const { riders } = useApp();
  const activeDeliveries = riders.filter((r) => r.status === "busy").length;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Live Dispatch</h2>
          <p className="text-[12px] text-[var(--muted-foreground)]">
            {activeDeliveries + 15} active deliveries in Dutse
          </p>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors">
          View Live Map
          <Navigation className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Map Placeholder */}
      <div className="relative h-[300px] bg-[var(--muted)] mx-4 mb-4 rounded-lg overflow-hidden">
        {/* Grid lines */}
        <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-[var(--border)]"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {/* Roads */}
          <line x1="10%" y1="45%" x2="90%" y2="45%" stroke="currentColor" strokeWidth="2" className="text-[var(--border)]" opacity="0.8" />
          <line x1="45%" y1="10%" x2="45%" y2="90%" stroke="currentColor" strokeWidth="2" className="text-[var(--border)]" opacity="0.8" />
          <line x1="20%" y1="20%" x2="80%" y2="80%" stroke="currentColor" strokeWidth="1" className="text-[var(--border)]" opacity="0.5" />
          <line x1="80%" y1="20%" x2="20%" y2="80%" stroke="currentColor" strokeWidth="1" className="text-[var(--border)]" opacity="0.5" />
        </svg>

        {/* Restaurant marker */}
        <div
          className="absolute flex items-center gap-1.5"
          style={{ left: "45%", top: "42%" }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--foreground)] shadow-lg">
            <MapPin className="h-4 w-4 text-[var(--background)]" />
          </div>
          <span className="rounded-md bg-[var(--foreground)] px-2 py-0.5 text-[10px] font-semibold text-[var(--background)] shadow-lg whitespace-nowrap">
            Hasinah Restaurant
          </span>
        </div>

        {/* Rider markers */}
        {riderPositions.map((pos, i) => (
          <div
            key={i}
            className="absolute"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full shadow-md ${
                pos.status === "available"
                  ? "bg-green-500"
                  : pos.status === "busy"
                  ? "bg-amber-500"
                  : "bg-gray-400"
              }`}
            >
              <Bike className="h-3 w-3 text-white" />
            </div>
          </div>
        ))}

        {/* Delivery markers */}
        {deliveryPositions.map((pos, i) => (
          <div
            key={i}
            className="absolute"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 shadow-md">
              <MapPin className="h-3 w-3 text-white" />
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-sm px-3 py-1.5">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-[10px] font-medium text-[var(--foreground)]">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-[10px] font-medium text-[var(--foreground)]">Busy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-[10px] font-medium text-[var(--foreground)]">Delivering</span>
          </div>
        </div>
      </div>
    </div>
  );
}
