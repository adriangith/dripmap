"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Crosshair } from "lucide-react";

import type { PlaceIndexEntry, PlaceType, Coordinates, OpeningHoursEntry } from "@/lib/types";
import type { ScoredPlace } from "@/lib/constraints";
import { useEnrichments } from "@/lib/integrations/use-enrichments";
import { DAYS, DAY_LETTERS, isOpenOnDay, todayIdx } from "@/lib/openingHours";

declare global {
  interface Window {
    __leafletMap?: L.Map;
  }
}

/** Normalize route points from either [lat, lng] arrays or {lat, lng} objects (Firestore). */
function toLatLng(pt: [number, number] | { lat: number; lng: number }): L.LatLngTuple {
  return Array.isArray(pt) ? pt : [pt.lat, pt.lng];
}

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
  museum: "#6d28d9",
};

// Lucide SVG inner elements (24x24 viewBox, stroke-based)
const PIN_ICONS: Record<PlaceType, string> = {
  swim: `<path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>`,
  beach: `<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>`,
  event: `<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>`,
  bushwalk: `<path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"/><path d="M12 22v-3"/>`,
  walk: `<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4"/><path d="M4 13h4"/>`,
  lookout: `<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>`,
  waterfall: `<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>`,
  cave: `<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>`,
  wildlife: `<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>`,
  pool: `<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>`,
  cycling: `<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>`,
  fishing: `<path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z"/><path d="M18 12v.5"/><path d="M16 17.93a9.77 9.77 0 0 1 0-11.86"/><path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33"/><path d="M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4"/><path d="m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98"/>`,
  eatery: `<path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/>`,
  playground: `<rect width="18" height="12" x="3" y="8" rx="1"/><path d="M10 8V5c0-.6-.4-1-1-1H6a1 1 0 0 0-1 1v3"/><path d="M19 8V5c0-.6-.4-1-1-1h-3a1 1 0 0 0-1 1v3"/>`,
  museum: `<path d="M10 18v-7"/><path d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/>`,
};

function buildHoursStripHtml(
  entries: OpeningHoursEntry[] | undefined,
  color: string,
  todayIndex: number,
  isEnriched = false,
): string {
  if (!entries || entries.length === 0) return "";
  const enrichedClass = isEnriched ? " enriched" : "";
  const cells = DAYS.map((d, i) => {
    const open = isOpenOnDay(entries, d);
    const classes = ["pin-flag-day"];
    if (open) classes.push("open");
    if (i === todayIndex) classes.push("today");
    const style = open ? `style="background:${escapeColor(color)};"` : "";
    return `<span class="${classes.join(" ")}" ${style}>${DAY_LETTERS[d]}</span>`;
  }).join("");
  return `<div class="pin-flag-hours${enrichedClass}">${cells}</div>`;
}

/** Whitelist for color values interpolated into inline style attributes. */
function escapeColor(color: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : "#6b7280";
}

function createPinIcon(
  type: PlaceType,
  opacity = 1,
  name?: string,
  slug?: string,
  openingHours?: OpeningHoursEntry[],
  enrichedHours?: OpeningHoursEntry[],
): L.DivIcon {
  const color = PIN_COLORS[type];
  const svgPaths = PIN_ICONS[type];
  const hasYamlHours = openingHours && openingHours.length > 0;
  const hours = hasYamlHours ? openingHours : enrichedHours;
  const isEnriched = !hasYamlHours && !!enrichedHours?.length;
  const hoursHtml = buildHoursStripHtml(hours, color, todayIdx(), isEnriched);
  const labelHtml = name
    ? `<div class="pin-flag"><div class="pin-flag-row"><div class="pin-flag-dot" style="background:${color};"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${svgPaths}</svg></div><span class="pin-flag-text">${name}</span></div>${hoursHtml}</div>`
    : "";
  return L.divIcon({
    className: "",
    html: `<div class="pin-wrapper" data-slug="${slug ?? ""}" style="opacity:${opacity};"><div class="pin-marker" style="background:${color};"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(45deg);">${svgPaths}</svg></div>${labelHtml}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
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
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const hoverRouteLayerRef = useRef<L.Polyline | null>(null);
  // Only fitBounds once (initial load) — after that the user owns the viewport
  const hasFitBoundsRef = useRef(false);

  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const prevFocusedSlugRef = useRef<string | null | undefined>(null);
  const enrichments = useEnrichments();

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
    window.__leafletMap = map;

    // Show/hide permanent POI labels based on zoom level
    const LABEL_ZOOM_THRESHOLD = 12;
    const updateLabels = () => {
      const show = map.getZoom() >= LABEL_ZOOM_THRESHOLD;
      mapContainerRef.current?.classList.toggle("show-poi-labels", show);
    };
    map.on("zoomend", updateLabels);
    updateLabels();

    // Clear hover route polyline when clicking empty map area
    map.on("click", () => {
      if (hoverRouteLayerRef.current) {
        hoverRouteLayerRef.current.remove();
        hoverRouteLayerRef.current = null;
      }
    });

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

      const marker = L.marker([loc.coordinates.lat, loc.coordinates.lng], {
        icon: createPinIcon(loc.type, pinOpacity, loc.name, loc.slug, loc.openingHours, enrichments[loc.slug]?.openingHours),
      });

      if (clusterGroup) clusterGroup.addLayer(marker);

      // On click: notify parent (route drawn by focus effect)
      marker.on("click", () => {
        // Clear any hover route
        if (hoverRouteLayerRef.current) {
          hoverRouteLayerRef.current.remove();
          hoverRouteLayerRef.current = null;
        }
        onMarkerClick(loc.slug);
      });

      // Hover behaviour (desktop only — touch devices fire spurious
      // mouseover/mouseout that would immediately close the popup)
      marker.on("mouseover", () => {
        marker.setZIndexOffset(10000);
        onMarkerHover(loc.slug);
      });
      marker.on("mouseout", () => {
        // Keep elevated z-index if this is the focused marker
        if (loc.slug !== prevFocusedSlugRef.current) {
          marker.setZIndexOffset(0);
        }
        onMarkerHover(null);
      });

      markersRef.current.set(loc.slug, marker);
    }

    // Re-apply active state if a marker is currently focused
    if (prevFocusedSlugRef.current) {
      const focusedMarker = markersRef.current.get(prevFocusedSlugRef.current);
      if (focusedMarker) {
        focusedMarker.setZIndexOffset(10000);
        const el = focusedMarker.getElement();
        el?.querySelector(".pin-wrapper")?.classList.add("active");
      }
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
  }, [locations, enrichments, onMarkerClick, onMarkerHover]);

  // Highlight effect — draw route polyline for walks on hover
  useEffect(() => {
    if (!highlightedSlug) return;
    const map = mapRef.current;

    // Draw route polyline for walk/bushwalk types (desktop hover only)
    // Skip if the focused detail panel already shows this route
    if (map && window.matchMedia("(hover: hover)").matches && highlightedSlug !== focusedSlug) {
      const loc = locations.find((l) => l.slug === highlightedSlug);
      if (loc && (loc.type === "walk" || loc.type === "bushwalk") && loc.route) {
        const polyline = L.polyline(
          loc.route.map(toLatLng),
          { color: PIN_COLORS[loc.type], weight: 4, opacity: 0.7 },
        ).addTo(map);
        hoverRouteLayerRef.current = polyline;
      }
    }

    return () => {
      if (hoverRouteLayerRef.current) {
        hoverRouteLayerRef.current.remove();
        hoverRouteLayerRef.current = null;
      }
    };
  }, [highlightedSlug, focusedSlug, locations]);

  // Focus effect — zoom to pin and center in visible area above sheet,
  // and draw route polyline for walk/bushwalk types.
  // Only fly to the POI when focusedSlug changes (not on sheet resize),
  // so the user can navigate freely (e.g. locate themselves) while a
  // location is active.
  useEffect(() => {
    const slugChanged = focusedSlug !== prevFocusedSlugRef.current;
    const prevSlug = prevFocusedSlugRef.current;
    prevFocusedSlugRef.current = focusedSlug;

    // Remove active state from previous marker
    if (prevSlug && slugChanged) {
      const prevMarker = markersRef.current.get(prevSlug);
      if (prevMarker) {
        prevMarker.setZIndexOffset(0);
        const el = prevMarker.getElement();
        el?.querySelector(".pin-wrapper")?.classList.remove("active");
      }
    }

    if (!focusedSlug) {
      // Clear route when detail panel closes
      if (routeLayerRef.current) {
        routeLayerRef.current.remove();
        routeLayerRef.current = null;
      }
      return;
    }

    if (!slugChanged) return;

    const map = mapRef.current;
    const marker = markersRef.current.get(focusedSlug);
    if (map && marker) {
      // Elevate and mark as active
      marker.setZIndexOffset(10000);
      const el = marker.getElement();
      el?.querySelector(".pin-wrapper")?.classList.add("active");

      const sh = focusSheetHeight ?? getSheetHeight();
      setViewAboveSheet(map, marker.getLatLng(), 15, sh);

      // Draw route polyline for walk/bushwalk types
      if (routeLayerRef.current) {
        routeLayerRef.current.remove();
        routeLayerRef.current = null;
      }
      const loc = locations.find((l) => l.slug === focusedSlug);
      if (loc && (loc.type === "walk" || loc.type === "bushwalk") && loc.route) {
        routeLayerRef.current = L.polyline(
          loc.route.map(toLatLng),
          { color: PIN_COLORS[loc.type], weight: 4, opacity: 0.7 },
        ).addTo(map);
        // Fit map to route bounds
        map.fitBounds(routeLayerRef.current.getBounds(), {
          paddingTopLeft: L.point(50, 50),
          paddingBottomRight: L.point(50, Math.max(50, sh)),
        });
      }
    }
  }, [focusedSlug, focusSheetHeight, locations]);

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
