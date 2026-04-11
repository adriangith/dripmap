import Link from "next/link";
import type { PlaceIndexEntry, Coordinates } from "@/lib/types";
import { haversineDistanceKm, formatDistance } from "@/lib/useCurrentLocation";
import TypeBadge from "./TypeBadge";
import StatusBadge from "./StatusBadge";

interface LocationCardProps {
  location: PlaceIndexEntry;
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
  const distance =
    userLocation
      ? formatDistance(haversineDistanceKm(userLocation, location.coordinates))
      : null;

  const cardClassName = `block rounded-lg border p-3 transition-all duration-100 active:scale-[0.98] active:shadow-none ${
    isHighlighted
      ? "border-blue-400 bg-blue-50 shadow-md"
      : "border-gray-200 bg-white shadow-sm hover:shadow-md"
  }`;

  const cardContent = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate">{location.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <TypeBadge type={location.type} showLabel={false} />
            <span className="text-sm text-gray-500">{location.country}</span>
            {distance && (
              <span className="text-xs text-blue-600 font-medium">{distance}</span>
            )}
            {location.cost && location.cost !== "free" && (
              <span className="text-xs text-gray-500">{location.cost}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusBadge status={location.status.site} />
        </div>
      </div>
      {location.highlights.length > 0 ? (
        <p className="text-sm text-gray-600 mt-1.5 line-clamp-1">
          {location.highlights[0]}
        </p>
      ) : location.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1 mt-2">
          {location.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
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
