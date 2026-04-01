# Driving Distance & Time — Design Spec

## Context

dripmap currently shows straight-line (haversine) distance from the user to each location. This is useful for sorting and a rough sense of proximity, but doesn't answer the practical question: "how long will it take me to drive there?" This feature adds real driving distance and time to the location detail panel.

## Requirements

- Show driving distance and estimated drive time on the detail panel when the user has geolocation enabled
- Use OSRM (Open Source Routing Machine) public API — free, no API key, OpenStreetMap-based
- Fail silently if OSRM is unavailable — the app must never break or block on this
- Do not modify the existing haversine distance shown at the top of the detail panel (it works offline and without geolocation)

## Data Flow

1. User opens a location's detail panel. The component already receives `userLocation` from geolocation.
2. If `userLocation` exists, fetch from OSRM:
   ```
   GET https://router.project-osrm.org/route/v1/driving/{userLng},{userLat};{destLng},{destLat}?overview=false
   ```
   OSRM uses `lng,lat` order (not `lat,lng`).
3. Response contains `routes[0].distance` (meters) and `routes[0].duration` (seconds).
4. Display formatted result above the navigation buttons.

## UI Placement

In the detail panel, a new "Getting There" section appears directly above the Google Maps / Apple Maps navigation buttons:

```
Getting There
~45 min · 380 km driving
[Google Maps]  [Apple Maps]
```

- The section only renders when `userLocation` is available AND the OSRM request succeeds.
- If either condition is not met, the navigation buttons render without the heading — no empty state, no error message.

## Formatting Rules

**Time:**
- Under 60 min: "~X min" (rounded to nearest 5 min, minimum "~5 min")
- 60 min and above: "~X hr Y min" (e.g., "~2 hr 30 min"), omit minutes if 0 ("~2 hr")

**Distance:**
- Under 10 km: one decimal place ("3.2 km")
- 10 km and above: whole numbers ("380 km")

The tilde (~) prefix on time signals that drive times are approximate without needing an explicit disclaimer.

## Caching

Cache OSRM responses in a `Map<string, { distance: number; duration: number }>` keyed by destination slug + user coordinates rounded to 3 decimal places. This prevents redundant requests when re-opening the same location (or opening it again after minor GPS drift). Uses the same ref-based caching pattern as the existing location JSON cache in `LocationDetailPanel.tsx`.

## Fallback Behavior

| Scenario | Behavior |
|----------|----------|
| No geolocation | "Getting There" section not rendered |
| OSRM request fails | "Getting There" section not rendered |
| OSRM request times out (3s) | "Getting There" section not rendered |
| OSRM returns very long route (cross-continental) | Show it as-is; tilde signals approximation |
| User is offline | "Getting There" section not rendered (fetch fails) |

In all fallback cases, the haversine distance at the top of the panel and the navigation buttons remain unaffected.

## Existing Behavior Unchanged

- Haversine distance shown next to the location name at the top of the detail panel — stays as-is
- Haversine-based sorting in the location list — stays as-is
- No driving info in the list cards — haversine is sufficient for browsing

## Future Consideration: List-Level Drive Times (Option 4)

If list-level drive times become desirable, OSRM's `/table/v1/` endpoint accepts one origin + N destinations in a single HTTP request, returning a full distance/duration matrix. This would allow showing drive times on every location card with one API call, similar to Google Maps search results. This approach was deferred because it adds a network dependency to the list view of an offline-first PWA and the complexity is not justified until there's user demand.
