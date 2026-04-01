"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair } from "lucide-react";

import type { LocationIndexEntry, LocationType, Coordinates } from "@/lib/types";

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
      pointer-events: none;
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

function createUserLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="user-location-pulse" style="
      position: relative;
      width: 18px; height: 18px;
    ">
      <div style="
        position: absolute; inset: 0;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(59,130,246,0.5);
        z-index: 2;
      "></div>
      <div class="user-location-ring" style="
        position: absolute;
        top: 50%; left: 50%;
        width: 36px; height: 36px;
        margin: -18px 0 0 -18px;
        background: rgba(59,130,246,0.15);
        border: 2px solid rgba(59,130,246,0.3);
        border-radius: 50%;
        z-index: 1;
      "></div>
    </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

interface LocationMapProps {
  locations: LocationIndexEntry[];
  highlightedSlug: string | null;
  onMarkerClick: (slug: string) => void;
  onMarkerHover: (slug: string | null) => void;
  onUserLocation?: (coords: Coordinates) => void;
}

export default function LocationMap({
  locations,
  highlightedSlug,
  onMarkerClick,
  onMarkerHover,
  onUserLocation,
}: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Prevent Leaflet from resolving default marker images relative to the
    // current page URL (they 404 on sub-routes like /location/*)
    delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
    L.Icon.Default.mergeOptions({ iconUrl: "", iconRetinaUrl: "", shadowUrl: "" });

    const worldBounds = L.latLngBounds([-90, -180], [90, 180]);

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      minZoom: 2,
      maxBounds: worldBounds,
      maxBoundsViscosity: 1.0,
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
      const popupContent = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = loc.name;
      const typeSpan = document.createElement("span");
      typeSpan.style.textTransform = "capitalize";
      typeSpan.textContent = loc.type.replace("-", " ");
      popupContent.append(strong, document.createElement("br"), typeSpan);

      const marker = L.marker([loc.coordinates.lat, loc.coordinates.lng], {
        icon: createPinIcon(loc.type),
      })
        .addTo(map)
        .bindPopup(popupContent, { autoClose: true, closeOnClick: true });

      // Show popup on hover, navigate on click
      marker.on("click", () => onMarkerClick(loc.slug));
      marker.on("mouseover", () => {
        marker.openPopup();
        onMarkerHover(loc.slug);
      });
      marker.on("mouseout", () => {
        marker.closePopup();
        onMarkerHover(null);
      });

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
      mapRef.current?.closePopup();
    };
  }, [highlightedSlug]);

  const handleLocateMe = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocateError("Geolocation not supported");
      return;
    }

    setLocating(true);
    setLocateError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const map = mapRef.current;
        if (map) {
          // Remove old user marker
          if (userMarkerRef.current) {
            userMarkerRef.current.remove();
          }

          const userMarker = L.marker([lat, lng], {
            icon: createUserLocationIcon(),
            zIndexOffset: 1000,
          })
            .addTo(map)
            .bindPopup("You are here");

          userMarkerRef.current = userMarker;
          map.setView([lat, lng], 12);
        }

        onUserLocation?.({ lat, lng });
        setLocating(false);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocateError("Location permission denied");
            break;
          case err.POSITION_UNAVAILABLE:
            setLocateError("Location unavailable");
            break;
          case err.TIMEOUT:
            setLocateError("Location request timed out");
            break;
          default:
            setLocateError("Unable to get location");
        }
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, [onUserLocation]);

  // Auto-dismiss error after 4 seconds
  useEffect(() => {
    if (!locateError) return;
    const t = setTimeout(() => setLocateError(null), 4000);
    return () => clearTimeout(t);
  }, [locateError]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* Locate me button — positioned above mobile bottom sheet */}
      <button
        onClick={handleLocateMe}
        disabled={locating}
        aria-label="Show my location"
        className="absolute bottom-[160px] right-4 lg:bottom-4 z-[1000] flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-60"
      >
        <Crosshair className={`w-5 h-5 text-blue-600 ${locating ? "animate-spin" : ""}`} />
      </button>

      {/* Error toast */}
      {locateError && (
        <div className="absolute bottom-[210px] right-4 lg:bottom-16 z-[1000] rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 shadow-md">
          {locateError}
        </div>
      )}
    </div>
  );
}
