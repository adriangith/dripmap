"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Crosshair } from "lucide-react";

import type { PlaceIndexEntry, PlaceType, Coordinates } from "@/lib/types";
import type { ScoredPlace } from "@/lib/constraints";

/**
 * Sets the map view so that `latLng` appears centered in the visible area
 * above the bottom sheet, at the given zoom level.  The adjusted centre is
 * computed purely with CRS projection math so the map view is never
 * temporarily moved (which caused a visible flash).
 */
function setViewAboveSheet(map: L.Map, latLng: L.LatLng | [number, number], zoom: number, sheetHeight: number) {
  let target = L.latLng(latLng);

  if (sheetHeight > 0) {
    // project() / unproject() work at any zoom without changing the view
    const point = map.project(target, zoom);
    // Shift the centre down by half the sheet height so the pin sits in the
    // visible area above the sheet
    const adjusted = L.point(point.x, point.y + sheetHeight / 2);
    target = map.unproject(adjusted, zoom);
  }

  map.flyTo(target, zoom, { duration: 0.8 });
}

const PIN_COLORS: Record<PlaceType, string> = {
  swim: "#0891b2",
  beach: "#3b82f6",
  event: "#db2777",
  bushwalk: "#15803d",
  walk: "#b45309",
  lookout: "#d97706",
  waterfall: "#1d4ed8",
  cave: "#4b5563",
  wildlife: "#ea580c",
  pool: "#7c3aed",
  cycling: "#65a30d",
  fishing: "#0d9488",
  eatery: "#e11d48",
  playground: "#10b981",
};

function createPinIcon(type: PlaceType, opacity = 1): L.DivIcon {
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
      opacity: ${opacity};
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
  locations: (PlaceIndexEntry & { _score?: number })[];
  highlightedSlug: string | null;
  focusedSlug?: string | null;
  onMarkerClick: (slug: string) => void;
  onMarkerHover: (slug: string | null) => void;
  onUserLocation?: (coords: Coordinates) => void;
  sheetHeight?: number;
  focusSheetHeight?: number;
}

/** Read the current sheet height from the CSS custom property (set by BottomSheet). */
function getSheetHeight(): number {
  if (typeof document === "undefined") return 0;
  return parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sheet-height")) || 0;
}

export default function LocationMap({
  locations,
  highlightedSlug,
  focusedSlug,
  onMarkerClick,
  onMarkerHover,
  onUserLocation,
  focusSheetHeight,
}: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  // Only fitBounds once (initial load) — after that the user owns the viewport
  const hasFitBoundsRef = useRef(false);

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

    // Choose tile style based on system color scheme
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const tileUrl = prefersDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    const tileLayer = L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    // Switch tiles when system theme changes
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onThemeChange = (e: MediaQueryListEvent) => {
      tileLayer.setUrl(
        e.matches
          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      );
    };
    mql.addEventListener("change", onThemeChange);

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

    // Show/hide permanent POI labels based on zoom level
    const LABEL_ZOOM_THRESHOLD = 12;
    const updateLabels = () => {
      const show = map.getZoom() >= LABEL_ZOOM_THRESHOLD;
      mapContainerRef.current?.classList.toggle("show-poi-labels", show);
    };
    map.on("zoomend", updateLabels);
    updateLabels();

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

      hasFitBoundsRef.current = true;
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
              setInitialLocation(pos.coords.latitude, pos.coords.longitude, 11);
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
      mql.removeEventListener("change", onThemeChange);
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

    // Add new markers — compute opacity from scores when available
    const scores = locations
      .map((l) => (l as ScoredPlace)._score)
      .filter((s): s is number => s !== undefined);
    const hasScores = scores.length > 0;
    const maxScore = hasScores ? Math.max(...scores) : 0;
    const minScore = hasScores ? Math.min(...scores) : 0;
    const scoreRange = maxScore - minScore;

    for (const loc of locations) {
      // Normalise score to 0.35–1.0 opacity range
      let pinOpacity = 1;
      if (hasScores && scoreRange > 0) {
        const s = (loc as ScoredPlace)._score ?? minScore;
        pinOpacity = 0.35 + 0.65 * ((s - minScore) / scoreRange);
      }

      const popupContent = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = loc.name;
      const typeSpan = document.createElement("span");
      typeSpan.style.textTransform = "capitalize";
      typeSpan.textContent = loc.type.replace("-", " ");
      popupContent.append(strong, document.createElement("br"), typeSpan);

      const marker = L.marker([loc.coordinates.lat, loc.coordinates.lng], {
        icon: createPinIcon(loc.type, pinOpacity),
      }).bindPopup(popupContent, { autoClose: true, closeOnClick: true });

      // Permanent label visible at higher zoom levels (CSS-controlled)
      marker.bindTooltip(loc.name, {
        permanent: true,
        direction: "top",
        offset: L.point(0, -30),
        className: "poi-label",
      });

      if (clusterGroup) clusterGroup.addLayer(marker);

      // On click: open popup + notify parent
      marker.on("click", () => {
        marker.openPopup();
        onMarkerClick(loc.slug);
      });

      // Hover behaviour (desktop only — touch devices fire spurious
      // mouseover/mouseout that would immediately close the popup)
      marker.on("mouseover", () => {
        if (window.matchMedia("(hover: hover)").matches) marker.openPopup();
        onMarkerHover(loc.slug);
      });
      marker.on("mouseout", () => {
        if (window.matchMedia("(hover: hover)").matches) marker.closePopup();
        onMarkerHover(null);
      });

      markersRef.current.set(loc.slug, marker);
    }

    // Fit bounds only on initial load — subsequent filter/preference changes
    // should not override the user's current viewport
    if (locations.length > 0 && !hasFitBoundsRef.current) {
      hasFitBoundsRef.current = true;
      const bounds = L.latLngBounds(
        locations.map((l) => [l.coordinates.lat, l.coordinates.lng])
      );
      // Offset bottom padding so the visible center accounts for the sheet
      map.fitBounds(bounds, {
        paddingTopLeft: L.point(50, 50),
        paddingBottomRight: L.point(50, Math.max(50, getSheetHeight())),
        maxZoom: 10,
      });
    }
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
      const sh = focusSheetHeight ?? getSheetHeight();
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

          // Center user in visible area above the sheet
          setViewAboveSheet(map, [lat, lng], 14, getSheetHeight());
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
        className="absolute right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 transition-colors disabled:opacity-60 lg:bottom-4"
        style={{ bottom: `calc(var(--sheet-height, 96px) + 84px)` }}
      >
        <Crosshair className={`w-5 h-5 text-blue-600 ${locating ? "animate-spin" : ""}`} />
      </button>

      {/* Error toast */}
      {locateError && (
        <div
          className="absolute right-4 z-50 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300 shadow-md lg:bottom-16"
          style={{ bottom: `calc(var(--sheet-height, 96px) + 132px)` }}
        >
          {locateError}
        </div>
      )}
    </div>
  );
}
