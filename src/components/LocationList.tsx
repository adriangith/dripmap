import Link from "next/link";
import type { LocationIndexEntry, Coordinates } from "@/lib/types";
import LocationCard from "./LocationCard";

interface LocationListProps {
  locations: LocationIndexEntry[];
  highlightedSlug: string | null;
  onHover: (slug: string | null) => void;
  userLocation?: Coordinates | null;
  onCardClick?: (slug: string) => void;
}

export default function LocationList({
  locations,
  highlightedSlug,
  onHover,
  userLocation,
  onCardClick,
}: LocationListProps) {
  if (locations.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <p>No locations match your filters.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {locations.map((loc) => (
        <LocationCard
          key={loc.slug}
          location={loc}
          onHover={onHover}
          isHighlighted={loc.slug === highlightedSlug}
          userLocation={userLocation}
          onCardClick={onCardClick}
        />
      ))}
      <div className="pt-2 pb-1 text-center">
        <Link href="/about" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          About dripmap
        </Link>
      </div>
    </div>
  );
}
