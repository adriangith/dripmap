"use client";

import { useState, useEffect, useCallback, type RefObject } from "react";

// Simple LRU-ish cache so repeated renders don't re-extract
const cache = new Map<string, string>();
const MAX_CACHE = 80;

/**
 * Extracts the average color from the left edge of an image.
 * Returns an "r, g, b" string for use in rgba(), or null while loading / on failure.
 *
 * Pass an optional ref to a container element — extraction is deferred until the
 * element is within 200px of the viewport (IntersectionObserver with rootMargin).
 */
export function useEdgeColor(
  src: string | undefined,
  containerRef?: RefObject<HTMLElement | null>,
): string | null {
  const cached = src ? cache.get(src) ?? null : null;
  const [asyncColor, setAsyncColor] = useState<string | null>(null);
  const [visible, setVisible] = useState(!containerRef);

  // Observe visibility when a container ref is provided
  const observerCallback = useCallback(([entry]: IntersectionObserverEntry[]) => {
    if (entry.isIntersecting) {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!containerRef) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(observerCallback, { rootMargin: "200px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, observerCallback]);

  useEffect(() => {
    if (!src || !visible || cache.has(src)) return;

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        if (img.naturalHeight <= 0 || img.naturalWidth <= 0) return;
        const h = 40;
        const w = Math.round((img.naturalWidth / img.naturalHeight) * h);
        if (!isFinite(w) || w <= 0 || w > 10000) return;
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

        if (!cancelled) setAsyncColor(result);
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
  }, [src, visible]);

  // Cache hit takes priority; async state is fallback for first load
  return cached ?? asyncColor;
}

/**
 * Darkens an "r, g, b" edge color so white text is always readable.
 * Preserves hue/saturation but caps perceived brightness to maxLuminance.
 */
export function darkenEdgeColor(rgb: string, maxLuminance = 90): string {
  const [r, g, b] = rgb.split(",").map(Number);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (lum <= maxLuminance) return rgb;
  const scale = maxLuminance / lum;
  return `${Math.round(r * scale)}, ${Math.round(g * scale)}, ${Math.round(b * scale)}`;
}
