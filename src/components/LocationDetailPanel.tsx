"use client";

import { useEffect, useState, useRef } from "react";
import {
  MapPin,
  Car,
  Shield,
  DollarSign,
  Calendar,
  AlertTriangle,
  Navigation,
  ExternalLink,
  Clock,
  Users,
} from "lucide-react";
import { Droplets, Waves } from "lucide-react";
import type { Place, SwimPlace, BeachPlace, EventPlace, Coordinates, Duration, Constraints } from "@/lib/types";
import { getLocationDetail } from "@/lib/locations";
import { fetchDrivingInfo, formatDriveTime, formatDriveDistance } from "@/lib/osrm";
import type { DrivingInfo } from "@/lib/osrm";
import { buildFitParagraph } from "@/lib/fit";
import StatusBadge from "./StatusBadge";
import TypeBadge from "./TypeBadge";
import BookmarkButton from "./BookmarkButton";
import VisitedButton from "./VisitedButton";
import { haversineDistanceKm, formatDistance } from "@/lib/useCurrentLocation";

const DURATION_DISPLAY: Record<Duration, string> = {
  quick: "Under 2 hours",
  "half-day": "Half day",
  "full-day": "Full day",
};

import CostIndicator from "./CostIndicator";
import SourceAttribution from "./SourceAttribution";
import { DAYS, DAY_LABELS, entriesForDay, formatHoursStatus, todayIdx } from "@/lib/openingHours";
import type { OpeningHoursEntry } from "@/lib/types";

function OpeningHoursSection({ entries }: { entries: OpeningHoursEntry[] }) {
  const todayIndex = todayIdx();
  const status = formatHoursStatus(entries);
  return (
    <section className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Hours</h3>
        {status && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              status.open
                ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            }`}
          >
            {status.label}
          </span>
        )}
      </div>
      <ul className="text-sm">
        {DAYS.map((d, i) => {
          const ranges = entriesForDay(entries, d);
          const isToday = i === todayIndex;
          return (
            <li
              key={d}
              className={`flex justify-between py-0.5 ${
                isToday ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"
              }`}
            >
              <span className="w-12">{DAY_LABELS[d]}</span>
              <span>
                {ranges.length === 0
                  ? <span className="text-gray-400 dark:text-gray-500">Closed</span>
                  : ranges.map((r) => `${r.open}–${r.close}`).join(", ")}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

interface LocationDetailPanelProps {
  slug: string;
  userLocation?: Coordinates | null;
  activeConstraints?: Constraints | null;
}

function SwimDetailsSection({ details }: { details: SwimPlace["details"] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Danger Level</p>
          <p className="text-sm font-medium capitalize">{details.dangerLevel}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Droplets className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Water Access</p>
          <p className="text-sm font-medium capitalize">{details.waterAccess}</p>
        </div>
      </div>
    </div>
  );
}

function BeachDetailsSection({ details }: { details: BeachPlace["details"] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div className="flex items-center gap-2">
        <Waves className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Beach Type</p>
          <p className="text-sm font-medium capitalize">{details.beachType.replace("-", " ")}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Wave Exposure</p>
          <p className="text-sm font-medium capitalize">{details.waveExposure}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Patrolled</p>
          <p className="text-sm font-medium">
            {details.patrolled.seasonal
              ? `${details.patrolled.months.join(", ")} ${details.patrolled.hours || ""}`
              : "No"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 text-center text-xs">🐕</span>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Dogs</p>
          <p className="text-sm font-medium capitalize">{details.dogPolicy.replace("-", " ")}</p>
        </div>
      </div>
      {details.waterHazards.length > 0 && (
        <div className="col-span-2">
          <p className="text-xs text-gray-500 mb-1">Hazards</p>
          <div className="flex flex-wrap gap-1">
            {details.waterHazards.map((h) => (
              <span key={h} className="px-2 py-0.5 text-xs bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded capitalize">
                {h.replace("-", " ")}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EventDetailsSection({ details }: { details: EventPlace["details"] }) {
  const rec = details.recurrence;
  let schedule = "";
  switch (rec.type) {
    case "once":
      schedule = rec.date;
      break;
    case "range":
      schedule = `${rec.startDate} – ${rec.endDate}`;
      break;
    case "weekly":
      schedule = `Every ${rec.days.join(", ")}${rec.season ? ` (${rec.season})` : ""}`;
      break;
    case "annual":
      schedule = `Annual — typically month ${rec.month}`;
      break;
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Schedule</p>
          <p className="text-sm font-medium">{schedule}</p>
          {rec.type !== "annual" && "startTime" in rec && rec.startTime && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{rec.startTime}{rec.endTime ? ` – ${rec.endTime}` : ""}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Venue</p>
          <p className="text-sm font-medium">{details.venue} ({details.venueType})</p>
        </div>
      </div>
      {details.bookingRequired && (
        <div className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Booking</p>
            {details.bookingUrl ? (
              <a href={details.bookingUrl} target="_blank" rel="noopener noreferrer"
                 className="text-sm text-blue-600 hover:underline">
                Book tickets
              </a>
            ) : (
              <p className="text-sm font-medium">Required</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LocationDetailPanel({
  slug,
  userLocation,
  activeConstraints,
}: LocationDetailPanelProps) {
  const [location, setLocation] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drivingInfo, setDrivingInfo] = useState<DrivingInfo | null>(null);
  const drivingCache = useRef<Map<string, DrivingInfo>>(new Map());

  useEffect(() => {
    if (!slug) return;

    let aborted = false;
    queueMicrotask(() => {
      if (aborted) return;
      setLoading(true);
      setError(null);
    });

    getLocationDetail(slug)
      .then((data: Place) => {
        if (aborted) return;
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
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="p-4">
        <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error || "Location not found"}
        </div>
      </div>
    );
  }

  const distance = userLocation
    ? formatDistance(haversineDistanceKm(userLocation, location.coordinates))
    : null;

  return (
    <div className="px-4 pb-6">
      {/* Title and badges */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{location.name}</h2>
          <div className="flex gap-1.5 shrink-0">
            <BookmarkButton slug={location.slug} />
            <VisitedButton slug={location.slug} />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <TypeBadge type={location.type} />
          <span className="text-sm text-gray-500 dark:text-gray-400">{location.country}</span>
          {distance && (
            <span className="text-xs text-blue-600 font-medium">{distance}</span>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 mb-4">
        <StatusBadge status={location.status.site} label={`Site: ${location.status.site}`} />
        {location.type === "swim" && (
          <StatusBadge
            status={location.details.waterAccess}
            label={`Water: ${location.details.waterAccess}`}
          />
        )}
        {location.status.note && (
          <p className="text-sm text-amber-700 ml-1">{location.status.note}</p>
        )}
      </div>

      {/* Fit blurb — personalised paragraph based on active preferences */}
      {(() => {
        const fitText = buildFitParagraph(location.fit, activeConstraints ?? null);
        return fitText ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg px-3 py-2 mb-3">
            {fitText}
          </p>
        ) : null;
      })()}

      {/* Description */}
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm mb-4">
        {location.description}
      </p>

      {/* Type-specific details */}
      <section className="mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Details</h3>
        {location.type === "swim" && <SwimDetailsSection details={location.details} />}
        {location.type === "beach" && <BeachDetailsSection details={location.details} />}
        {location.type === "event" && <EventDetailsSection details={location.details} />}
      </section>

      {location.openingHours && location.openingHours.length > 0 && (
        <OpeningHoursSection entries={location.openingHours} />
      )}

      {/* Common info */}
      <section className="mb-4">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Accessibility</p>
              <p className="text-sm font-medium capitalize">{location.accessibility}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Parking</p>
              <p className="text-sm font-medium capitalize">{location.parking}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Cost</p>
              <CostIndicator cost={location.cost} showLabel />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Best Season</p>
              <p className="text-sm font-medium capitalize">{location.bestSeason.join(", ")}</p>
            </div>
          </div>
          {location.duration && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Typical Duration</p>
                <p className="text-sm font-medium">{DURATION_DISPLAY[location.duration]}</p>
              </div>
            </div>
          )}
        </div>
        {(location.ageSuitability.ideal.length > 0 || location.ageSuitability.minAge !== null) && (
          <div className="flex items-start gap-2 mt-2.5">
            <Users className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Age Suitability</p>
              <p className="text-sm font-medium capitalize">
                {location.ageSuitability.ideal.join(", ")}
              </p>
              {location.ageSuitability.minAge !== null && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Min age: {location.ageSuitability.minAge}+
                </p>
              )}
            </div>
          </div>
        )}
        {location.facilities.length > 0 && (
          <div className="mt-2.5">
            <p className="text-xs text-gray-500 mb-1">Facilities</p>
            <div className="flex flex-wrap gap-1">
              {location.facilities.map((f) => (
                <span key={f} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded capitalize">
                  {f.replaceAll("-", " ")}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Directions */}
      <section className="mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
          Directions
        </h3>
        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          {location.directions}
        </p>
      </section>

      {/* Tips */}
      {location.tips.length > 0 && (
        <section className="mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1.5">Tips</h3>
          <ul className="space-y-1.5">
            {location.tips.map((tip, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
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
              className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Getting There + Navigation */}
      {drivingInfo && (
        <div className="mb-2">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
            Getting There
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <Car className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
            <span>
              {formatDriveTime(drivingInfo.duration)} · {formatDriveDistance(drivingInfo.distance)} driving
            </span>
          </div>
        </div>
      )}
      <div className="flex gap-3 mb-4">
        {location.source && (
          <SourceAttribution source={location.source} variant="detail" />
        )}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${location.coordinates.lat},${location.coordinates.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors min-h-[44px]"
        >
          <Navigation className="w-4 h-4" />
          Google Maps
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </a>
        <a
          href={`https://maps.apple.com/?daddr=${location.coordinates.lat},${location.coordinates.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 dark:bg-gray-200 px-4 py-3 text-sm font-medium text-white dark:text-gray-900 shadow-sm hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors min-h-[44px]"
        >
          <Navigation className="w-4 h-4" />
          Apple Maps
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </a>
      </div>

      {/* Coordinates & verified */}
      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
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
