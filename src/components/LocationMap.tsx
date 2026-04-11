"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Crosshair } from "lucide-react";

import type { PlaceIndexEntry, PlaceType, Coordinates } from "@/lib/types";

/**
 * Sets the map view so that `latLng` appears centered in the visible area
 * above the bottom sheet, at the given zoom level. Computes the adjusted
 * center in a single step to avoid jarring two-phase animation.
 */
function setViewAboveSheet(map: L.Map, latLng: L.LatLng | [number, number], zoom: number, sheetHeight: number) {
  // Save current view so we can restore it before animating
  const origCenter = map.getCenter();
  const origZoom = map.getZoom();

  // Temporarily jump to target to get coordinate mapping at the target zoom
  map.setView(latLng, zoom, { animate: false });
  let target = L.latLng(latLng);
  if (sheetHeight > 0) {
    const pinPoint = map.latLngToContainerPoint(target);
    target = map.containerPointToLatLng(
      L.point(pinPoint.x, pinPoint.y + sheetHeight / 2)
    );
  }

  // Restore original view, then smoothly fly to the computed target
  map.setView(origCenter, origZoom, { animate: false });
  map.flyTo(target, zoom, { duration: 0.8 });
}

const PIN_COLORS: Record<PlaceType, string> = {
  swim: "#0891b2",
  beach: "#3b82f6",
  event: "#db2777",
  bushwalk: "#15803d",
  lookout: "#d97706",
  waterfall: "#1d4ed8",
  cave: "#4b5563",
  wildlife: "#ea580c",
  pool: "#7c3aed",
  cycling: "#65a30d",
  fishing: "#0d9488",
};

function createPinIcon(type: PlaceType): L.DivIcon {
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
  locations: PlaceIndexEntry[];
  highlightedSlug: string | null;
  focusedSlug?: string | null;
  onMarkerClick: (slug: string) => void;
  onMarkerHover: (slug: string | null) => void;
  onUserLocation?: (coords: Coordinates) => void;
  sheetHeight?: number;
  focusSheetHeight?: number;
}

export default function LocationMap({
  locations,
  highlightedSlug,
  focusedSlug,
  onMarkerClick,
  onMarkerHover,
  onUserLocation,
  sheetHeight = 0,
  focusSheetHeight,
}: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  // Keep a ref so callbacks always read the latest sheetHeight without re-creating
  const sheetHeightRef = useRef(sheetHeight);
  useEffect(() => { sheetHeightRef.current = sheetHeight; }, [sheetHeight]);
  // Skip fitBounds after locate so the centering isn't overridden by re-sort
  const skipFitBoundsRef = useRef(false);

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
    }).setView([-37.8, 145.0], 7); // Default: Victoria, Australia

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      chunkedLoading: true,
    });
    clusterGroup.addTo(map);
    clusterGroupRef.current = clusterGroup;

    mapRef.current = map;
    // Expose for E2E tests
    (window as any).__leafletMap = map;

    // Determine initial position: prefer browser geolocation if already
    // granted, otherwise fall back to IP-based geolocation.
    const setInitialLocation = (lat: number, lng: number, zoom: number) => {
      if (!mapRef.current) return;
      mapRef.current.setView([lat, lng], zoom, { animate: false });
      onUserLocation?.({ lat, lng });

      // Place blue dot
      if (userMarkerRef.current) userMarkerRef.current.remove();
      userMarkerRef.current = L.marker([lat, lng], {
        icon: createUserLocationIcon(),
        zIndexOffset: 1000,
      }).addTo(mapRef.current).bindPopup("You are here");

      skipFitBoundsRef.current = true;
    };

    // Try browser geolocation first (silent — only if already granted)
    let usedBrowserLocation = false;
    const geoPromise = new Promise<void>((resolve) => {
      if (typeof navigator === "undefined" || !navigator.permissions) {
        resolve();
        return;
      }
      navigator.permissions.query({ name: "geolocation" }).then((perm) => {
        if (perm.state === "granted") {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              usedBrowserLocation = true;
              setInitialLocation(pos.coords.latitude, pos.coords.longitude, 10);
              resolve();
            },
            () => resolve(),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 },
          );
        } else {
          resolve();
        }
      }).catch(() => resolve());
    });

    // If browser geolocation wasn't available, try IP-based
    geoPromise.then(() => {
      if (usedBrowserLocation) return;
      fetch("https://ipapi.co/json/")
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.latitude && data?.longitude && mapRef.current) {
            mapRef.current.setView([data.latitude, data.longitude], 8, { animate: true });
          }
        })
        .catch(() => { /* keep default Victoria view */ });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      clusterGroupRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when locations change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    const clusterGroup = clusterGroupRef.current;
    if (clusterGroup) clusterGroup.clearLayers();
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
      }).bindPopup(popupContent, { autoClose: true, closeOnClick: true });

      if (clusterGroup) clusterGroup.addLayer(marker);

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

    // Fit bounds if there are locations (skip if user just located themselves)
    if (locations.length > 0 && !skipFitBoundsRef.current) {
      const bounds = L.latLngBounds(
        locations.map((l) => [l.coordinates.lat, l.coordinates.lng])
      );
      // Offset bottom padding so the visible center accounts for the sheet
      map.fitBounds(bounds, {
        paddingTopLeft: L.point(50, 50),
        paddingBottomRight: L.point(50, Math.max(50, sheetHeightRef.current)),
        maxZoom: 10,
      });
    }
    skipFitBoundsRef.current = false;
  }, [locations, onMarkerClick, onMarkerHover]);

  // Highlight effect — open popup on hover (no panning to avoid jarring movement)
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

  // Focus effect — zoom to pin and center in visible area above sheet
  useEffect(() => {
    if (!focusedSlug) return;
    const map = mapRef.current;
    const marker = markersRef.current.get(focusedSlug);
    if (map && marker) {
      const sh = focusSheetHeight ?? sheetHeightRef.current;
      setViewAboveSheet(map, marker.getLatLng(), 12, sh);
    }
  }, [focusedSlug, focusSheetHeight]);

  const handleLocateMe = useCallback(() => {
    if (!window.isSecureContext) {
      setLocateError("Location requires HTTPS connection");
      return;
    }

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

          // Prevent fitBounds from overriding this view when the
          // distance-sorted location list triggers a re-render
          skipFitBoundsRef.current = true;

          // Center user in visible area above the sheet
          setViewAboveSheet(map, [lat, lng], 12, sheetHeightRef.current);
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
      <div ref={mapContainerRef} className="h-full w-full isolate" />

      {/* Locate me button — positioned above mobile bottom sheet */}
      <button
        onClick={handleLocateMe}
        disabled={locating}
        aria-label="Show my location"
        data-testid="locate-button"
        className="absolute right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-all disabled:opacity-60 lg:bottom-4"
        style={{ bottom: `calc(var(--sheet-height, ${sheetHeight}px) + 16px)` }}
      >
        <Crosshair className={`w-5 h-5 text-blue-600 ${locating ? "animate-spin" : ""}`} />
      </button>

      {/* Error toast */}
      {locateError && (
        <div
          className="absolute right-4 z-50 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 shadow-md lg:bottom-16"
          style={{ bottom: `calc(var(--sheet-height, ${sheetHeight}px) + 64px)` }}
        >
          {locateError}
        </div>
      )}
    </div>
  );
}
