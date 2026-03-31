import type { LocationIndexEntry } from "@/lib/types";
import LocationCard from "./LocationCard";

interface LocationListProps {
  locations: LocationIndexEntry[];
  highlightedSlug: string | null;
  onHover: (slug: string | null) => void;
}

export default function LocationList({
  locations,
  highlightedSlug,
  onHover,
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
        />
      ))}
    </div>
  );
}
