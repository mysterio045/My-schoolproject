"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, Bike, RefreshCw } from "lucide-react";
import { getRiders } from "@/lib/api/riders";
import { getDeliveries } from "@/lib/api/deliveries";
import type { DeliveryRecord, RiderRecord } from "@/lib/types";

const MAX_ROWS = 100;
const IN_FLIGHT_DELIVERY_STATUSES: DeliveryRecord["status"][] = [
  "assigned",
  "accepted",
  "picked_up",
  "on_the_way",
];

interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

function projectPoint(
  lat: number,
  lng: number,
  bounds: MapBounds
): { x: number; y: number } {
  const pad = 12;
  const rangeLat = Math.max(bounds.maxLat - bounds.minLat, 1e-6);
  const rangeLng = Math.max(bounds.maxLng - bounds.minLng, 1e-6);
  const x = (lng - bounds.minLng) / rangeLng * (100 - 2 * pad) + pad;
  const y = (bounds.maxLat - lat) / rangeLat * (100 - 2 * pad) + pad;
  return { x, y };
}

export default function DispatchMap() {
  const [riders, setRiders] = useState<RiderRecord[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ridersRes, deliveriesRes] = await Promise.all([
        getRiders({ page: 1, page_size: MAX_ROWS }),
        getDeliveries({ page: 1, page_size: MAX_ROWS }),
      ]);
      setRiders(ridersRes.items);
      setDeliveries(
        deliveriesRes.items.filter((d) =>
          IN_FLIGHT_DELIVERY_STATUSES.includes(d.status)
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const activeDeliveries = riders.filter((r) => r.status === "busy").length;
  const availableRiders = riders.filter((r) => r.status === "available").length;
  const offlineRiders = riders.filter((r) => r.status === "offline").length;

  const riderMarkers = riders.filter(
    (r) => r.lat !== null && r.lng !== null
  );
  const deliveryMarkers = deliveries.filter(
    (d) => d.rider_lat !== null && d.rider_lng !== null
  );

  const coordinatePoints: { lat: number; lng: number }[] = [
    ...riderMarkers.map((r) => ({ lat: r.lat as number, lng: r.lng as number })),
    ...deliveryMarkers.map((d) => ({
      lat: d.rider_lat as number,
      lng: d.rider_lng as number,
    })),
  ];

  const bounds: MapBounds | null =
    coordinatePoints.length > 0
      ? {
          minLat: Math.min(...coordinatePoints.map((p) => p.lat)),
          maxLat: Math.max(...coordinatePoints.map((p) => p.lat)),
          minLng: Math.min(...coordinatePoints.map((p) => p.lng)),
          maxLng: Math.max(...coordinatePoints.map((p) => p.lng)),
        }
      : null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
            Live Dispatch
          </h2>
          <p className="text-[12px] text-[var(--muted-foreground)]">
            {activeDeliveries} active deliveries · {availableRiders} available · {offlineRiders} offline
            {" — "}
            {loading ? "loading…" : "schematic map from real rider coordinates"}
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
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
        {!loading &&
          bounds &&
          riderMarkers.map((rider) => {
            const pos = projectPoint(rider.lat as number, rider.lng as number, bounds);
            return (
              <div key={rider.id} className="absolute" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full shadow-md ${
                    rider.status === "available"
                      ? "bg-green-500"
                      : rider.status === "busy"
                      ? "bg-amber-500"
                      : "bg-gray-400"
                  }`}
                >
                  <Bike className="h-3 w-3 text-white" />
                </div>
              </div>
            );
          })}

        {/* Delivery markers */}
        {!loading &&
          bounds &&
          deliveryMarkers.map((delivery) => {
            const pos = projectPoint(
              delivery.rider_lat as number,
              delivery.rider_lng as number,
              bounds
            );
            return (
              <div key={delivery.id} className="absolute" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 shadow-md">
                  <MapPin className="h-3 w-3 text-white" />
                </div>
              </div>
            );
          })}

        {!loading && !bounds && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-5 text-center">
            <Bike className="h-8 w-8 text-[var(--muted-foreground)] opacity-30" />
            <p className="text-[12px] text-[var(--muted-foreground)]">
              No rider coordinates available yet — markers appear when riders
              have a live location.
            </p>
          </div>
        )}

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