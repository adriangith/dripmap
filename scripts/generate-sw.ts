/**
 * Post-build script that generates the service worker from the actual
 * build output in out/. This fixes a timing issue where @ducanh2912/next-pwa
 * generates the SW during webpack compilation before chunk hashes are finalized,
 * resulting in stale precache entries.
 *
 * This script also adds caching for HTML pages and RSC payloads (.txt files)
 * which the plugin doesn't cover, enabling full offline navigation.
 */

import { generateSW, type ManifestEntry } from "workbox-build";

async function main() {
  const { count, size, warnings } = await generateSW({
    swDest: "out/sw.js",
    globDirectory: "out",
    globPatterns: [
      // Core app shell & framework assets
      "_next/static/**/*.{js,css,png}",
      // All HTML pages for direct-URL offline access
      "**/*.html",
      // Location data for offline map use
      "generated/**/*.json",
      // PWA icons
      "icons/**/*.png",
      "apple-touch-icon.png",
      "favicon.ico",
      "manifest.json",
    ],
    globIgnores: ["sw.js", "workbox-*.js"],

    // Map /about.html → /about in precache so clean URLs work offline
    manifestTransforms: [
      async (entries: Array<ManifestEntry & { size: number }>) => {
        const manifest = entries.map((entry) => {
          if (entry.url.endsWith(".html")) {
            if (entry.url === "index.html") {
              return { ...entry, url: "/" };
            }
            return { ...entry, url: entry.url.replace(/\.html$/, "") };
          }
          return entry;
        });
        return { manifest };
      },
    ],

    directoryIndex: "index.html",
    // Fallback for pages not in precache (e.g. added after user installed the app)
    navigateFallback: "/",
    navigateFallbackDenylist: [/^\/_next\//, /^\/api\//],

    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],

    runtimeCaching: [
      // RSC payloads for client-side navigation
      {
        urlPattern: /\.txt$/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "rsc-payloads",
          expiration: {
            maxEntries: 500,
            maxAgeSeconds: 60 * 60 * 24 * 7,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      // CartoDB Voyager tiles
      {
        urlPattern: /^https:\/\/[abcd]\.basemaps\.cartocdn\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "map-tiles",
          expiration: {
            maxEntries: 1000,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      // Location detail JSON (runtime fallback for non-precached)
      {
        urlPattern: /\/generated\/locations\/.*\.json$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "location-details",
          expiration: {
            maxEntries: 500,
            maxAgeSeconds: 60 * 60 * 24 * 7,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      // Location index
      {
        urlPattern: /\/generated\/locations-index\.json$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "location-index",
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      // Images
      {
        urlPattern: /\/images\/.*$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "images",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
  });

  console.log(
    `✓ Generated SW: ${count} files precached (${(size / 1024).toFixed(0)} KB)`
  );
  if (warnings.length > 0) {
    console.warn("  Warnings:", warnings.join("\n  "));
  }
}

main().catch((err) => {
  console.error("Failed to generate service worker:", err);
  process.exit(1);
});
