"use client";

import { useState, useEffect, useCallback, type RefObject } from "react";

// Simple LRU-ish cache so repeated renders don't re-extract
const cache = new Map<string, string>();
const MAX_CACHE = 80;

/**
 * Extracts the most common color from the visible region of a card's image.
 * Returns an "r, g, b" string for use in rgba(), or null while loading / on failure.
 */
export function useEdgeColor(
  src: string | undefined,
  containerRef?: RefObject<HTMLElement | null>,
): string | null {
  const cached = src ? cache.get(src) ?? null : null;
  const [asyncColor, setAsyncColor] = useState<string | null>(null);
  const [visible, setVisible] = useState(!containerRef);

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
        const h = 16;
        const w = Math.round((img.naturalWidth / img.naturalHeight) * h);
        if (!isFinite(w) || w <= 0 || w > 10000) return;
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);

        // Sample only the visible cropped region (~right 77% of image)
        const visibleLeft = Math.round(w * 0.23);
        const visibleW = w - visibleLeft;
        const data = ctx.getImageData(visibleLeft, 0, visibleW, h).data;
        const totalPixels = visibleW * h;

        // Fast bucketing with typed arrays (3-bit per channel = 512 buckets)
        const bucketCount = new Uint16Array(512);
        const bucketR = new Uint32Array(512);
        const bucketG = new Uint32Array(512);
        const bucketB = new Uint32Array(512);

        for (let i = 0; i < data.length; i += 4) {
          const pr = data[i], pg = data[i + 1], pb = data[i + 2];
          const max = Math.max(pr, pg, pb);
          const min = Math.min(pr, pg, pb);
          if (max < 30 || min > 225) continue;

          const key = ((pr >> 5) << 6) | ((pg >> 5) << 3) | (pb >> 5);
          bucketCount[key]++;
          bucketR[key] += pr;
          bucketG[key] += pg;
          bucketB[key] += pb;
        }

        // Find best bucket, biased toward warm colors
        let bestIdx = -1;
        let bestScore = -1;
        for (let i = 0; i < 512; i++) {
          const cnt = bucketCount[i];
          if (cnt === 0) continue;
          const ar = bucketR[i] / cnt;
          const ab = bucketB[i] / cnt;
          const warmth = 1 + Math.max(0, (ar - ab) / 255);
          const score = cnt * warmth;
          if (score > bestScore) {
            bestScore = score;
            bestIdx = i;
          }
        }

        let bestR: number, bestG: number, bestB: number;
        if (bestIdx >= 0) {
          const cnt = bucketCount[bestIdx];
          bestR = Math.round(bucketR[bestIdx] / cnt);
          bestG = Math.round(bucketG[bestIdx] / cnt);
          bestB = Math.round(bucketB[bestIdx] / cnt);
        } else {
          let sr = 0, sg = 0, sb = 0;
          for (let i = 0; i < data.length; i += 4) {
            sr += data[i]; sg += data[i + 1]; sb += data[i + 2];
          }
          bestR = Math.round(sr / totalPixels);
          bestG = Math.round(sg / totalPixels);
          bestB = Math.round(sb / totalPixels);
        }

        const result = `${bestR}, ${bestG}, ${bestB}`;

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

    img.onerror = () => {};
    img.src = src;
    return () => { cancelled = true; };
  }, [src, visible]);

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
