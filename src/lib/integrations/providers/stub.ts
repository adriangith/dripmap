import type { EventProvider, ExternalEvent } from "../types";

/**
 * Stub provider for development and testing.
 * Returns a few hardcoded Melbourne events to demonstrate the adapter pattern.
 */
export const stubProvider: EventProvider = {
  name: "stub",

  async fetchEvents(): Promise<ExternalEvent[]> {
    return [
      {
        sourceId: "stub-night-noodle-markets",
        title: "Night Noodle Markets",
        coordinates: { lat: -37.8225, lng: 144.9832 },
        venue: "Birrarung Marr",
        region: "Melbourne CBD",
        startDate: "2026-11-10",
        endDate: "2026-11-27",
        startTime: "17:00",
        endTime: "22:00",
        description:
          "Melbourne's favourite outdoor food festival returns to Birrarung Marr with hawker-style stalls, live music, and waterfront dining.",
        imageUrl: "/images/placeholder-event.jpg",
        cost: "$",
        bookingRequired: false,
        tags: ["food", "family-friendly", "outdoor"],
        duration: "quick",
        venueType: "outdoor",
        organiser: "Good Food",
        source: {
          provider: "stub",
          url: "https://example.com/night-noodle-markets",
        },
      },
      {
        sourceId: "stub-white-night",
        title: "White Night Melbourne",
        coordinates: { lat: -37.8136, lng: 144.9631 },
        venue: "Melbourne CBD",
        region: "Melbourne CBD",
        startDate: "2026-08-22",
        startTime: "19:00",
        endTime: "07:00",
        description:
          "An all-night celebration of art, light, and culture across the city centre with installations, performances, and interactive experiences.",
        cost: "free",
        bookingRequired: false,
        tags: ["arts", "culture", "evening"],
        duration: "half-day",
        venueType: "outdoor",
        organiser: "City of Melbourne",
        source: {
          provider: "stub",
          url: "https://example.com/white-night",
        },
      },
      {
        sourceId: "stub-dinosaur-world",
        title: "Dinosaur World Exhibition",
        coordinates: { lat: -37.8033, lng: 144.9717 },
        venue: "Melbourne Museum",
        region: "Carlton",
        startDate: "2026-06-01",
        endDate: "2026-10-15",
        startTime: "10:00",
        endTime: "17:00",
        description:
          "Life-size animatronic dinosaurs take over the Melbourne Museum in this immersive exhibition for all ages.",
        cost: "$$",
        bookingRequired: true,
        bookingUrl: "https://example.com/dinosaur-world/tickets",
        tags: ["museum", "family-friendly", "indoor"],
        duration: "half-day",
        venueType: "indoor",
        organiser: "Museums Victoria",
        source: {
          provider: "stub",
          url: "https://example.com/dinosaur-world",
        },
      },
    ];
  },
};
