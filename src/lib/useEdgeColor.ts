"use client";

import { useState, useEffect } from "react";

// Simple LRU-ish cache so repeated renders don't re-extract
const cache = new Map<string, string>();
const MAX_CACHE = 80;

/**
 * Extracts the average color from the left edge of an image.
 * Returns an "r, g, b" string for use in rgba(), or null while loading / on failure.
 */
export function useEdgeColor(src: string | undefined): string | null {
  // Read from cache synchronously — avoids calling setState in the effect body
  const cached = src ? cache.get(src) ?? null : null;
  const [color, setColor] = useState<string | null>(cached);

  // Keep color in sync when src changes and we already have a cached value
  const current = cached ?? color;
  if (cached && cached !== color) {
    setColor(cached);
  }

  useEffect(() => {
    if (!src || cache.has(src)) return;

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        // Draw small for speed
        const h = 40;
        const w = Math.round((img.naturalWidth / img.naturalHeight) * h);
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);

        // Sample left 8% strip
        const stripW = Math.max(1, Math.round(w * 0.08));
        const data = ctx.getImageData(0, 0, stripW, h).data;

        let r = 0,
          g = 0,
          b = 0;
        const count = stripW * h;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        const result = `${r}, ${g}, ${b}`;

        // Evict oldest entries if cache is full
        if (cache.size >= MAX_CACHE) {
          const first = cache.keys().next().value;
          if (first !== undefined) cache.delete(first);
        }
        cache.set(src, result);

        if (!cancelled) setColor(result);
      } catch {
        // Tainted canvas (CORS) — leave color as null → fallback gradient
      }
    };

    img.onerror = () => {
      // Image failed to load — leave null
    };

    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return current;
}
