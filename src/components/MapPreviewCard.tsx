import Link from "next/link";
import type { LocationIndexEntry } from "@/lib/types";
import TypeBadge from "./TypeBadge";
import StatusBadge from "./StatusBadge";

interface MapPreviewCardProps {
  location: LocationIndexEntry;
  onClose: () => void;
}

export default function MapPreviewCard({
  location,
  onClose,
}: MapPreviewCardProps) {
  return (
    <div
      className="absolute left-4 right-4 lg:left-auto lg:right-4 lg:w-80 z-[1000] bottom-[170px] lg:bottom-5"
      data-testid="map-preview-card"
    >
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 truncate">
              {location.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <TypeBadge type={location.type} showLabel={false} />
              <StatusBadge status={location.status.site} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 shrink-0"
            aria-label="Close preview"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <Link
          href={`/location/${location.slug}`}
          className="mt-2 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          View Details →
        </Link>
      </div>
    </div>
  );
}
