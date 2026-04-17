"use client";

import { useRef } from "react";
import Link from "next/link";
import type { PlaceIndexEntry, Coordinates, Constraints } from "@/lib/types";
import { haversineDistanceKm, formatDistance } from "@/lib/useCurrentLocation";
import { buildFitParagraph } from "@/lib/fit";
import { useEdgeColor, darkenEdgeColor } from "@/lib/useEdgeColor";
import TypeBadge from "./TypeBadge";
import StatusBadge from "./StatusBadge";
import CostIndicator from "./CostIndicator";
import SourceAttribution from "./SourceAttribution";
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

  const cardRef = useRef<HTMLElement>(null);
  const fitBlurb = buildFitParagraph(location.fit, activeConstraints ?? null, location, null, driveMinutes);
  const hoursStatus = formatHoursStatus(location.openingHours);

  const edgeColor = useEdgeColor(photo, cardRef);
  // Always darken the edge color so white text is readable over the gradient
  const gradientColor = edgeColor ? darkenEdgeColor(edgeColor) : null;

  const cardClassName = `block rounded-lg border overflow-hidden transition-all duration-100 active:scale-[0.98] active:shadow-none ${
    isHighlighted
      ? "border-blue-400 bg-blue-50 dark:bg-blue-950 shadow-md"
      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md"
  }`;

  // Shared bottom row: highlights / fit / tags
  const bottomRow = fitBlurb ? (
    <p className={`text-sm mt-1.5 ${photo ? "max-w-[65%] text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" : "line-clamp-2 text-emerald-700 dark:text-emerald-400"}`}>
      {fitBlurb}
    </p>
  ) : location.highlights.length > 0 ? (
    <p className={`text-sm mt-1.5 ${photo ? "max-w-[65%] text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" : "line-clamp-1 text-gray-600 dark:text-gray-400"}`}>
      {location.highlights[0]}
    </p>
  ) : location.tags.length > 0 ? (
    <div className={`flex flex-wrap gap-1 mt-2 ${photo ? "max-w-[65%]" : ""}`}>
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
    <div className={`flex items-center gap-2 ${photo ? "[&_span]:text-white/80 [&_span]:drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" : ""}`}>
      <TypeBadge type={location.type} showLabel={false} />
      <span className={`text-sm ${photo ? "text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" : "text-gray-500 dark:text-gray-400"}`}>{location.country}</span>
      {distance && (
        <span className={`text-xs font-medium ${photo ? "text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" : "text-gray-500 dark:text-gray-400"}`}>{distance}</span>
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
    // Full-bleed photo card with edge-color gradient on left
    <div
      className="relative w-full overflow-hidden"
      style={
        gradientColor
          ? { backgroundColor: `rgb(${gradientColor})` }
          : { backgroundColor: "#000" }
      }
    >
      {/* Oversized container shifts photo center rightward; card clips overflow */}
      <div className="absolute top-0 h-full" style={{ width: "130%", left: "10%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover brightness-90 saturate-[0.85]"
        />
      </div>
      {/* Left-to-right gradient using extracted edge color, falling back to dark */}
      <div
        className="absolute inset-0"
        style={
          gradientColor
            ? {
                background: `linear-gradient(to right, rgb(${gradientColor}) 25%, transparent 80%)`,
              }
            : {
                background: "linear-gradient(to right, rgb(0,0,0) 25%, transparent 80%)",
              }
        }
      />
      <div className="relative p-3 pt-1.5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className={`font-semibold text-white truncate text-sm drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]`}>{location.name}</h3>
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
        ref={cardRef as React.RefObject<HTMLButtonElement>}
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
      ref={cardRef as React.RefObject<HTMLAnchorElement>}
      href={`/location/${location.slug}`}
      className={cardClassName}
      onMouseEnter={() => onHover?.(location.slug)}
      onMouseLeave={() => onHover?.(null)}
    >
      {cardContent}
    </Link>
  );
}
