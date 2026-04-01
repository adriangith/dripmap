"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Coordinates } from "@/lib/types";

interface MiniMapProps {
  coordinates: Coordinates;
  name: string;
}

export default function MiniMap({ coordinates, name }: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    }).setView([coordinates.lat, coordinates.lng], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const icon = L.divIcon({
      className: "",
      html: `<div style="
        width: 24px; height: 24px;
        background: #2563eb;
        border: 2px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      popupAnchor: [0, -24],
    });

    L.marker([coordinates.lat, coordinates.lng], { icon })
      .addTo(map)
      .bindPopup(name);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [coordinates, name]);

  return (
    <div
      ref={containerRef}
      className="h-48 w-full rounded-lg overflow-hidden border border-gray-200"
    />
  );
}
