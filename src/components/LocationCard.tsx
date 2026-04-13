import Link from "next/link";
import type { PlaceIndexEntry, Coordinates } from "@/lib/types";
import { haversineDistanceKm, formatDistance } from "@/lib/useCurrentLocation";
import TypeBadge from "./TypeBadge";
import StatusBadge from "./StatusBadge";
import Image from "next/image";

const COST_STYLES: Record<string, { label: string; className: string }> = {
  free: { label: "Free", className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" },
  "$": { label: "$", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400" },
  "$$": { label: "$$", className: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400" },
  "$$$": { label: "$$$", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" },
};

function CostBadge({ cost }: { cost: string }) {
  const style = COST_STYLES[cost];
  if (!style) return null;
  return (
    <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${style.className}`}>
      {style.label}
    </span>
  );
}

interface LocationCardProps {
  location: PlaceIndexEntry & { _driveMinutes?: number | null };
  onHover?: (slug: string | null) => void;
  isHighlighted?: boolean;
  userLocation?: Coordinates | null;
  onCardClick?: (slug: string) => void;
}

export default function LocationCard({
  location,
  onHover,
  isHighlighted,
  userLocation,
  onCardClick,
}: LocationCardProps) {
  const driveMinutes = (location as { _driveMinutes?: number | null })._driveMinutes;
  const distance = driveMinutes != null
    ? `~${Math.round(driveMinutes)} min`
    : userLocation
      ? formatDistance(haversineDistanceKm(userLocation, location.coordinates))
      : null;

  const photo = location.photo && !location.photo.includes("placeholder") ? location.photo : undefined;

  const cardClassName = `block rounded-lg border overflow-hidden transition-all duration-100 active:scale-[0.98] active:shadow-none ${
    isHighlighted
      ? "border-blue-400 bg-blue-50 dark:bg-blue-950 shadow-md"
      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md"
  }`;

  const cardContent = (
    <>
      {photo && (
        <div className="relative w-full h-20 -mb-2">
          <Image
            src={photo}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-gray-800" />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{location.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <TypeBadge type={location.type} showLabel={false} />
              <span className="text-sm text-gray-500 dark:text-gray-400">{location.country}</span>
              {distance && (
                <span className="text-xs text-blue-600 font-medium">{distance}</span>
              )}
              <CostBadge cost={location.cost} />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusBadge status={location.status.site} />
          </div>
        </div>
        {location.highlights.length > 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 line-clamp-1">
            {location.highlights[0]}
          </p>
        ) : location.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1 mt-2">
            {location.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </>
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
