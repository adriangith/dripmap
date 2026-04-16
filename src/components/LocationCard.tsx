"use client";

import Link from "next/link";
import type { PlaceIndexEntry, Coordinates, Constraints } from "@/lib/types";
import { haversineDistanceKm, formatDistance } from "@/lib/useCurrentLocation";
import { buildFitParagraph } from "@/lib/fit";
import { useEdgeColor } from "@/lib/useEdgeColor";
import TypeBadge from "./TypeBadge";
import StatusBadge from "./StatusBadge";
import CostIndicator from "./CostIndicator";
import SourceAttribution from "./SourceAttribution";
import Image from "next/image";
import { formatHoursStatus } from "@/lib/openingHours";

interface LocationCardProps {
  location: PlaceIndexEntry & { _driveMinutes?: number | null };
  onHover?: (slug: string | null) => void;
  isHighlighted?: boolean;
  userLocation?: Coordinates | null;
  onCardClick?: (slug: string) => void;
  activeConstraints?: Constraints | null;
}

export default function LocationCard({
  location,
  onHover,
  isHighlighted,
  userLocation,
  onCardClick,
  activeConstraints,
}: LocationCardProps) {
  const driveMinutes = (location as { _driveMinutes?: number | null })._driveMinutes;
  const distance = driveMinutes != null
    ? (() => {
        const mins = Math.round(driveMinutes);
        if (mins < 60) return `~${mins} min`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m === 0 ? `~${h} hr` : `~${h} hr ${m} min`;
      })()
    : userLocation
      ? formatDistance(haversineDistanceKm(userLocation, location.coordinates))
      : null;

  const photo = location.photo && !location.photo.includes("placeholder") ? location.photo : undefined;

  const fitBlurb = buildFitParagraph(location.fit, activeConstraints ?? null);
  const hoursStatus = formatHoursStatus(location.openingHours);

  const edgeColor = useEdgeColor(photo);

  const cardClassName = `block rounded-lg border overflow-hidden transition-all duration-100 active:scale-[0.98] active:shadow-none ${
    isHighlighted
      ? "border-blue-400 bg-blue-50 dark:bg-blue-950 shadow-md"
      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md"
  }`;

  // Shared bottom row: highlights / fit / tags
  const bottomRow = fitBlurb ? (
    <p className={`text-sm mt-1.5 line-clamp-2 ${photo ? "text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" : "text-emerald-700 dark:text-emerald-400"}`}>
      {fitBlurb}
    </p>
  ) : location.highlights.length > 0 ? (
    <p className={`text-sm mt-1.5 line-clamp-1 ${photo ? "text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" : "text-gray-600 dark:text-gray-400"}`}>
      {location.highlights[0]}
    </p>
  ) : location.tags.length > 0 ? (
    <div className="flex flex-wrap gap-1 mt-2">
      {location.tags.slice(0, 3).map((tag) => (
        <span
          key={tag}
          className={`px-1.5 py-0.5 text-xs rounded ${photo ? "bg-white/20 text-white backdrop-blur-sm" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}
        >
          {tag}
        </span>
      ))}
    </div>
  ) : null;

  // Meta row: type icon, country, distance, cost, hours, source
  const metaRow = (
    <div className={`flex items-center gap-2 ${photo ? "[&_span]:text-white/80 [&_span]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" : ""}`}>
      <TypeBadge type={location.type} showLabel={false} />
      <span className={`text-sm ${photo ? "text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" : "text-gray-500 dark:text-gray-400"}`}>{location.country}</span>
      {distance && (
        <span className={`text-xs font-medium ${photo ? "text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" : "text-gray-500 dark:text-gray-400"}`}>{distance}</span>
      )}
      <CostIndicator cost={location.cost} />
      {hoursStatus && (
        <span
          className={`text-xs font-medium px-1.5 py-0.5 rounded ${
            photo
              ? hoursStatus.open
                ? "bg-emerald-500/30 text-white backdrop-blur-sm"
                : "bg-black/20 text-white/70 backdrop-blur-sm"
              : hoursStatus.open
                ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          }`}
        >
          {hoursStatus.label}
        </span>
      )}
      {location.source && <SourceAttribution source={location.source} />}
    </div>
  );

  const cardContent = photo ? (
    // Full-bleed photo card — image offset right, edge-color gradient on left
    <div className="relative w-full">
      <Image
        src={photo}
        alt=""
        fill
        className="brightness-90 saturate-[0.85]"
        style={{ objectFit: "cover", objectPosition: "65% center" }}
        sizes="(max-width: 768px) 100vw, 400px"
      />
      {/* Left-to-right gradient using extracted edge color, falling back to dark */}
      <div
        className="absolute inset-0"
        style={
          edgeColor
            ? {
                background: `linear-gradient(to right, rgba(${edgeColor}, 0.95) 0%, rgba(${edgeColor}, 0.75) 35%, rgba(${edgeColor}, 0.25) 65%, transparent 100%)`,
              }
            : {
                background: "linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.45) 40%, transparent 100%)",
              }
        }
      />
      <div className="relative p-3 pt-1.5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-white truncate text-sm drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">{location.name}</h3>
          <div className="shrink-0">
            <StatusBadge status={location.status.site} />
          </div>
        </div>
        {metaRow}
        {bottomRow}
      </div>
    </div>
  ) : (
    // No-photo fallback
    <div className="p-3 pt-1.5">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{location.name}</h3>
        <div className="shrink-0">
          <StatusBadge status={location.status.site} />
        </div>
      </div>
      {metaRow}
      {bottomRow}
    </div>
  );

  // When onCardClick is provided, render as button (mobile sheet mode)
  if (onCardClick) {
    return (
      <button
        className={`${cardClassName} w-full text-left`}
        onClick={() => onCardClick(location.slug)}
        onMouseEnter={() => onHover?.(location.slug)}
        onMouseLeave={() => onHover?.(null)}
      >
        {cardContent}
      </button>
    );
  }

  // Default: render as link (desktop sidebar)
  return (
    <Link
      href={`/location/${location.slug}`}
      className={cardClassName}
      onMouseEnter={() => onHover?.(location.slug)}
      onMouseLeave={() => onHover?.(null)}
    >
      {cardContent}
    </Link>
  );
}
