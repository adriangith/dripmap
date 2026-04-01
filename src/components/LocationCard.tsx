import Link from "next/link";
import type { LocationIndexEntry, Coordinates } from "@/lib/types";
import { haversineDistanceKm, formatDistance } from "@/lib/useCurrentLocation";
import TypeBadge from "./TypeBadge";
import StatusBadge from "./StatusBadge";

interface LocationCardProps {
  location: LocationIndexEntry;
  onHover?: (slug: string | null) => void;
  isHighlighted?: boolean;
  userLocation?: Coordinates | null;
}

export default function LocationCard({
  location,
  onHover,
  isHighlighted,
  userLocation,
}: LocationCardProps) {
  const distance =
    userLocation
      ? formatDistance(haversineDistanceKm(userLocation, location.coordinates))
      : null;

  return (
    <Link
      href={`/location/${location.slug}`}
      className={`block rounded-lg border p-3 transition-all duration-100 active:scale-[0.98] active:shadow-none ${
        isHighlighted
          ? "border-blue-400 bg-blue-50 shadow-md"
          : "border-gray-200 bg-white shadow-sm hover:shadow-md"
      }`}
      onMouseEnter={() => onHover?.(location.slug)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate">{location.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <TypeBadge type={location.type} showLabel={false} />
            <span className="text-sm text-gray-500">{location.country}</span>
            {distance && (
              <span className="text-xs text-blue-600 font-medium">{distance}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusBadge status={location.status.site} />
          {location.status.site === "open" &&
            location.status.waterAccess !== "open" && (
              <StatusBadge
                status={location.status.waterAccess}
                label={`Water: ${location.status.waterAccess}`}
              />
            )}
        </div>
      </div>
      {location.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {location.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
