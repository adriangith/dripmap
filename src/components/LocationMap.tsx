"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LocationIndexEntry, LocationType } from "@/lib/types";

const PIN_COLORS: Record<LocationType, string> = {
  waterfall: "#2563eb",
  "swimming-hole": "#0891b2",
  "splash-pad": "#7c3aed",
  spring: "#059669",
  creek: "#0d9488",
};

function createPinIcon(type: LocationType): L.DivIcon {
  const color = PIN_COLORS[type];
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 28px; height: 28px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

interface LocationMapProps {
  locations: LocationIndexEntry[];
  highlightedSlug: string | null;
  onMarkerClick: (slug: string) => void;
  onMarkerHover: (slug: string | null) => void;
}

export default function LocationMap({
  locations,
  highlightedSlug,
  onMarkerClick,
  onMarkerHover,
}: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([20, 0], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when locations change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // Add new markers
    for (const loc of locations) {
      const marker = L.marker([loc.coordinates.lat, loc.coordinates.lng], {
        icon: createPinIcon(loc.type),
      })
        .addTo(map)
        .bindPopup(
          `<strong>${loc.name}</strong><br/><span style="text-transform:capitalize">${loc.type.replace("-", " ")}</span>`
        );

      marker.on("click", () => onMarkerClick(loc.slug));
      marker.on("mouseover", () => onMarkerHover(loc.slug));
      marker.on("mouseout", () => onMarkerHover(null));

      markersRef.current.set(loc.slug, marker);
    }

    // Fit bounds if there are locations
    if (locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map((l) => [l.coordinates.lat, l.coordinates.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }
  }, [locations, onMarkerClick, onMarkerHover]);

  // Highlight effect
  useEffect(() => {
    if (!highlightedSlug) return;

    const marker = markersRef.current.get(highlightedSlug);
    if (marker) {
      marker.openPopup();
    }

    return () => {
      if (marker) marker.closePopup();
    };
  }, [highlightedSlug]);

  return <div ref={mapContainerRef} className="h-full w-full" />;
}
