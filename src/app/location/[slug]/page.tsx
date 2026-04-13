import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Car, Shield, DollarSign, Calendar, Clock, AlertTriangle, Navigation, ExternalLink, Droplets, Waves, Users } from "lucide-react";
import { getLocationDetailStatic, getAllLocationSlugs } from "@/lib/locations";
import Footer from "@/components/Footer";
import StatusBadge from "@/components/StatusBadge";
import TypeBadge from "@/components/TypeBadge";
import BookmarkButton from "@/components/BookmarkButton";
import MiniMapWrapper from "@/components/MiniMapWrapper";
import DrivingInfoBanner from "@/components/DrivingInfoBanner";
import CostIndicator from "@/components/CostIndicator";
import type { Metadata } from "next";
import type { Place, SwimPlace, BeachPlace, EventPlace, Duration } from "@/lib/types";

const DURATION_DISPLAY: Record<Duration, string> = {
  quick: "Under 2 hours",
  "half-day": "Half day",
  "full-day": "Full day",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllLocationSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const location = getLocationDetailStatic(slug);
    return {
      title: `${location.name} — Drift`,
      description: location.description.slice(0, 160),
    };
  } catch {
    return { title: "Location not found — Drift" };
  }
}

export default async function LocationPage({ params }: PageProps) {
  const { slug } = await params;

  let location: Place;
  try {
    location = getLocationDetailStatic(slug) as Place;
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {/* Hero area */}
        <div className="bg-blue-50 dark:bg-gray-800 h-48 flex items-center justify-center">
          {location.photos.length > 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-blue-400" />
              <p>{location.photos[0].alt}</p>
            </div>
          ) : (
            <MapPin className="w-12 h-12 text-blue-300 dark:text-blue-500" />
          )}
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to map
          </Link>

          {/* Title and badges */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {location.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <TypeBadge type={location.type} />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {location.country}
                </span>
              </div>
            </div>
            <BookmarkButton slug={location.slug} />
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 mb-6">
            <StatusBadge status={location.status.site} label={`Site: ${location.status.site}`} />
            {location.type === "swim" && (
              <StatusBadge
                status={(location as SwimPlace).details.waterAccess}
                label={`Water: ${(location as SwimPlace).details.waterAccess}`}
              />
            )}
            {location.status.note && (
              <p className="text-sm text-amber-700 dark:text-amber-400 ml-2">{location.status.note}</p>
            )}
          </div>

          {/* Driving info (client-side, uses browser geolocation) */}
          <DrivingInfoBanner destination={location.coordinates} />

          {/* Highlights */}
          {location.highlights.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {location.highlights.map((h) => (
                <span key={h} className="px-2.5 py-1 text-sm bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                  {h}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <section className="mb-6">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {location.description}
            </p>
          </section>

          {/* Type-specific details */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Details</h2>
            {location.type === "swim" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Danger Level</p>
                    <p className="text-sm font-medium capitalize">{(location as SwimPlace).details.dangerLevel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Water Access</p>
                    <p className="text-sm font-medium capitalize">{(location as SwimPlace).details.waterAccess}</p>
                  </div>
                </div>
              </div>
            )}
            {location.type === "beach" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Beach Type</p>
                    <p className="text-sm font-medium capitalize">{(location as BeachPlace).details.beachType.replace("-", " ")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Wave Exposure</p>
                    <p className="text-sm font-medium capitalize">{(location as BeachPlace).details.waveExposure}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Patrolled</p>
                    <p className="text-sm font-medium">
                      {(location as BeachPlace).details.patrolled.seasonal
                        ? `${(location as BeachPlace).details.patrolled.months.join(", ")} ${(location as BeachPlace).details.patrolled.hours || ""}`
                        : "No"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 text-gray-400 text-center text-xs">🐕</span>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Dogs</p>
                    <p className="text-sm font-medium capitalize">{(location as BeachPlace).details.dogPolicy.replace("-", " ")}</p>
                  </div>
                </div>
              </div>
            )}
            {location.type === "event" && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Venue</p>
                    <p className="text-sm font-medium">{(location as EventPlace).details.venue} ({(location as EventPlace).details.venueType})</p>
                  </div>
                </div>
                {(location as EventPlace).details.bookingRequired && (location as EventPlace).details.bookingUrl && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <a href={(location as EventPlace).details.bookingUrl ?? undefined} target="_blank" rel="noopener noreferrer"
                       className="text-sm text-blue-600 hover:underline">Book tickets</a>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Practical info */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Practical Info
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Accessibility</p>
                  <p className="text-sm font-medium capitalize">{location.accessibility}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Parking</p>
                  <p className="text-sm font-medium capitalize">{location.parking}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cost</p>
                  <CostIndicator cost={location.cost} showLabel />
                </div>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Best Season</p>
                  <p className="text-sm font-medium capitalize">{location.bestSeason.join(", ")}</p>
                </div>
              </div>
              {location.duration && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Typical Duration</p>
                    <p className="text-sm font-medium">{DURATION_DISPLAY[location.duration]}</p>
                  </div>
                </div>
              )}
            </div>
            {(location.ageSuitability.ideal.length > 0 || location.ageSuitability.minAge !== null) && (
              <div className="flex items-start gap-2 mt-3">
                <Users className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Age Suitability</p>
                  <p className="text-sm font-medium capitalize">
                    {location.ageSuitability.ideal.join(", ")}
                  </p>
                  {location.ageSuitability.minAge !== null && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Min age: {location.ageSuitability.minAge}+
                    </p>
                  )}
                </div>
              </div>
            )}
            {location.facilities.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-1">Facilities</p>
                <div className="flex flex-wrap gap-1">
                  {location.facilities.map((f) => (
                    <span key={f} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded capitalize">
                      {f.replaceAll("-", " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Directions */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Directions
            </h2>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
              {location.directions}
            </p>
          </section>

          {/* Tips */}
          {location.tips.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Tips
              </h2>
              <ul className="space-y-2">
                {location.tips.map((tip, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="text-blue-500 mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Tags */}
          {location.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-6">
              {location.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Mini map */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Location
            </h2>
            <MiniMapWrapper
              coordinates={location.coordinates}
              name={location.name}
            />
            <p className="text-xs text-gray-500 mt-1">
              {location.coordinates.lat.toFixed(4)},{" "}
              {location.coordinates.lng.toFixed(4)}
            </p>
            {/* Get Directions */}
            <div className="flex gap-3 mt-3">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${location.coordinates.lat},${location.coordinates.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Google Maps
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
              <a
                href={`https://maps.apple.com/?daddr=${location.coordinates.lat},${location.coordinates.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 dark:bg-gray-200 px-4 py-2.5 text-sm font-medium text-white dark:text-gray-900 shadow-sm hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Apple Maps
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            </div>
          </section>

          <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
            Last verified: {location.status.lastVerified}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
