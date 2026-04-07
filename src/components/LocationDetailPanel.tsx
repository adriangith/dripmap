"use client";

import { useEffect, useState, useRef } from "react";
import {
  ArrowLeft,
  MapPin,
  Car,
  Shield,
  DollarSign,
  Calendar,
  AlertTriangle,
  Navigation,
  ExternalLink,
} from "lucide-react";
import type { Location, Coordinates } from "@/lib/types";
import { fetchDrivingInfo, formatDriveTime, formatDriveDistance } from "@/lib/osrm";
import type { DrivingInfo } from "@/lib/osrm";
import StatusBadge from "./StatusBadge";
import TypeBadge from "./TypeBadge";
import BookmarkButton from "./BookmarkButton";
import WeatherSection from "./WeatherSection";
import { haversineDistanceKm, formatDistance } from "@/lib/useCurrentLocation";

interface LocationDetailPanelProps {
  slug: string;
  onBack: () => void;
  userLocation?: Coordinates | null;
}

export default function LocationDetailPanel({
  slug,
  onBack,
  userLocation,
}: LocationDetailPanelProps) {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef<Map<string, Location>>(new Map());
  const [drivingInfo, setDrivingInfo] = useState<DrivingInfo | null>(null);
  const drivingCache = useRef<Map<string, DrivingInfo>>(new Map());

  useEffect(() => {
    if (!slug) return;

    // Check cache first
    const cached = cache.current.get(slug);
    if (cached) {
      setLocation(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let aborted = false;
    setLoading(true);
    setError(null);

    fetch(`/generated/locations/${slug}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Location) => {
        if (aborted) return;
        cache.current.set(slug, data);
        // Keep cache small
        if (cache.current.size > 5) {
          const oldest = cache.current.keys().next().value;
          if (oldest) cache.current.delete(oldest);
        }
        setLocation(data);
      })
      .catch(() => { if (!aborted) setError("Failed to load location details"); })
      .finally(() => { if (!aborted) setLoading(false); });

    return () => { aborted = true; };
  }, [slug]);

  useEffect(() => {
    let aborted = false;

    const key = userLocation && location
      ? `${userLocation.lat.toFixed(3)},${userLocation.lng.toFixed(3)},${location.slug}`
      : null;

    const resolve = (): Promise<DrivingInfo | null> => {
      if (!userLocation || !location || !key) return Promise.resolve(null);
      const cached = drivingCache.current.get(key);
      if (cached) return Promise.resolve(cached);
      return fetchDrivingInfo(userLocation, location.coordinates);
    };

    resolve().then((info) => {
      if (aborted) return;
      if (info && key) {
        drivingCache.current.set(key, info);
        if (drivingCache.current.size > 20) {
          const oldest = drivingCache.current.keys().next().value;
          if (oldest) drivingCache.current.delete(oldest);
        }
      }
      setDrivingInfo(info);
    });

    return () => { aborted = true; };
  }, [userLocation, location]);

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-20 bg-gray-100 rounded" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 bg-gray-100 rounded" />
          <div className="h-12 bg-gray-100 rounded" />
          <div className="h-12 bg-gray-100 rounded" />
          <div className="h-12 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="p-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error || "Location not found"}
        </div>
      </div>
    );
  }

  const p = location.practical;
  const distance = userLocation
    ? formatDistance(haversineDistanceKm(userLocation, location.coordinates))
    : null;

  return (
    <div className="px-4 pb-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-3 min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to list
      </button>

      {/* Title and badges */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-gray-900">{location.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <TypeBadge type={location.type} />
            <span className="text-sm text-gray-500">{location.country}</span>
            {distance && (
              <span className="text-xs text-blue-600 font-medium">{distance}</span>
            )}
          </div>
        </div>
        <BookmarkButton slug={location.slug} />
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 mb-4">
        <StatusBadge
          status={location.status.site}
          label={`Site: ${location.status.site}`}
        />
        <StatusBadge
          status={location.status.waterAccess}
          label={`Water: ${location.status.waterAccess}`}
        />
        {location.status.note && (
          <p className="text-sm text-amber-700 ml-1">{location.status.note}</p>
        )}
      </div>

      {/* Weather */}
      <WeatherSection
        locationType={location.type}
        driveSeconds={drivingInfo?.duration ?? null}
      />

      {/* Description */}
      <p className="text-gray-700 leading-relaxed text-sm mb-4">
        {location.description}
      </p>

      {/* Practical info */}
      <section className="mb-4">
        <h3 className="text-base font-semibold text-gray-900 mb-2">
          Practical Info
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Accessibility</p>
              <p className="text-sm font-medium capitalize">
                {p.accessibility.replaceAll("-", " ")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Parking</p>
              <p className="text-sm font-medium capitalize">{p.parking}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Danger Level</p>
              <p className="text-sm font-medium capitalize">{p.dangerLevel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Cost</p>
              <p className="text-sm font-medium capitalize">{p.cost}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Best Season</p>
              <p className="text-sm font-medium capitalize">
                {p.bestSeason.join(", ")}
              </p>
            </div>
          </div>
        </div>

        {p.facilities.length > 0 && (
          <div className="mt-2.5">
            <p className="text-xs text-gray-500 mb-1">Facilities</p>
            <div className="flex flex-wrap gap-1">
              {p.facilities.map((f) => (
                <span
                  key={f}
                  className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded capitalize"
                >
                  {f.replaceAll("-", " ")}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Directions */}
      <section className="mb-4">
        <h3 className="text-base font-semibold text-gray-900 mb-1.5">
          Directions
        </h3>
        <p className="text-gray-700 text-sm leading-relaxed">
          {location.directions}
        </p>
      </section>

      {/* Tips */}
      {location.tips.length > 0 && (
        <section className="mb-4">
          <h3 className="text-base font-semibold text-gray-900 mb-1.5">Tips</h3>
          <ul className="space-y-1.5">
            {location.tips.map((tip, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-gray-700"
              >
                <span className="text-blue-500 mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tags */}
      {location.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {location.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Getting There + Navigation */}
      {drivingInfo && (
        <div className="mb-2">
          <h3 className="text-base font-semibold text-gray-900 mb-1.5">
            Getting There
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Car className="w-4 h-4 text-gray-400 shrink-0" />
            <span>
              {formatDriveTime(drivingInfo.duration)} · {formatDriveDistance(drivingInfo.distance)} driving
            </span>
          </div>
        </div>
      )}
      <div className="flex gap-3 mb-4">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${location.coordinates.lat},${location.coordinates.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors min-h-[44px]"
        >
          <Navigation className="w-4 h-4" />
          Google Maps
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </a>
        <a
          href={`https://maps.apple.com/?daddr=${location.coordinates.lat},${location.coordinates.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-gray-800 transition-colors min-h-[44px]"
        >
          <Navigation className="w-4 h-4" />
          Apple Maps
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </a>
      </div>

      {/* Coordinates & verified */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <MapPin className="w-3 h-3" />
        <span>
          {location.coordinates.lat.toFixed(4)},{" "}
          {location.coordinates.lng.toFixed(4)}
        </span>
        <span>·</span>
        <span>Verified: {location.status.lastVerified}</span>
      </div>
    </div>
  );
}
