"use client";

import { useState, useEffect } from "react";
import { Car } from "lucide-react";
import { fetchDrivingInfo, formatDriveTime, formatDriveDistance } from "@/lib/osrm";
import type { Coordinates } from "@/lib/types";

interface DrivingInfoBannerProps {
  destination: Coordinates;
}

/**
 * Client component that reads the user's geolocation (if already granted)
 * and shows driving time/distance to the destination.
 */
export default function DrivingInfoBanner({ destination }: DrivingInfoBannerProps) {
  const [info, setInfo] = useState<{ duration: number; distance: number } | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    // Only use geolocation if already granted — don't prompt
    navigator.permissions?.query({ name: "geolocation" }).then((perm) => {
      if (perm.state !== "granted") return;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const origin: Coordinates = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          const result = await fetchDrivingInfo(origin, destination);
          if (result) setInfo(result);
        },
        () => {},
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
      );
    });
  }, [destination]);

  if (!info) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm text-blue-700 dark:text-blue-300 mb-4">
      <Car className="w-4 h-4 shrink-0" />
      <span>{formatDriveTime(info.duration)} · {formatDriveDistance(info.distance)} driving</span>
    </div>
  );
}
