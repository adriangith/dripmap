import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Car, Shield, DollarSign, Calendar, AlertTriangle, Navigation, ExternalLink } from "lucide-react";
import { getLocationDetailStatic, getAllLocationSlugs } from "@/lib/locations";
import Footer from "@/components/Footer";
import StatusBadge from "@/components/StatusBadge";
import TypeBadge from "@/components/TypeBadge";
import BookmarkButton from "@/components/BookmarkButton";
import MiniMapWrapper from "@/components/MiniMapWrapper";
import WeatherSection from "@/components/WeatherSection";
import type { Metadata } from "next";

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
      title: `${location.name} — dripmap`,
      description: location.description.slice(0, 160),
    };
  } catch {
    return { title: "Location not found — dripmap" };
  }
}

export default async function LocationPage({ params }: PageProps) {
  const { slug } = await params;

  let location;
  try {
    location = getLocationDetailStatic(slug);
  } catch {
    notFound();
  }

  const p = location.practical;

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {/* Hero area */}
        <div className="bg-blue-50 h-48 flex items-center justify-center">
          {location.photos.length > 0 ? (
            <div className="text-center text-gray-500 text-sm">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-blue-400" />
              <p>{location.photos[0].alt}</p>
            </div>
          ) : (
            <MapPin className="w-12 h-12 text-blue-300" />
          )}
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to map
          </Link>

          {/* Title and badges */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {location.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <TypeBadge type={location.type} />
                <span className="text-sm text-gray-500">
                  {location.country}
                </span>
              </div>
            </div>
            <BookmarkButton slug={location.slug} />
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 mb-6">
            <StatusBadge status={location.status.site} label={`Site: ${location.status.site}`} />
            <StatusBadge
              status={location.status.waterAccess}
              label={`Water: ${location.status.waterAccess}`}
            />
            {location.status.note && (
              <p className="text-sm text-amber-700 ml-2">
                {location.status.note}
              </p>
            )}
          </div>

          {/* Weather */}
          <WeatherSection locationType={location.type} driveSeconds={null} />

          {/* Description */}
          <section className="mb-6">
            <p className="text-gray-700 leading-relaxed">
              {location.description}
            </p>
          </section>

          {/* Practical info */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Practical Info
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Accessibility</p>
                  <p className="text-sm font-medium capitalize">
                    {p.accessibility.replaceAll("-", " ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Parking</p>
                  <p className="text-sm font-medium capitalize">{p.parking}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Danger Level</p>
                  <p className="text-sm font-medium capitalize">
                    {p.dangerLevel}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Cost</p>
                  <p className="text-sm font-medium capitalize">{p.cost}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Best Season</p>
                  <p className="text-sm font-medium capitalize">
                    {p.bestSeason.join(", ")}
                  </p>
                </div>
              </div>
            </div>

            {p.facilities.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-1">Facilities</p>
                <div className="flex flex-wrap gap-1">
                  {p.facilities.map((f) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded capitalize"
                    >
                      {f.replaceAll("-", " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Directions */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Directions
            </h2>
            <p className="text-gray-700 text-sm leading-relaxed">
              {location.directions}
            </p>
          </section>

          {/* Tips */}
          {location.tips.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Tips
              </h2>
              <ul className="space-y-2">
                {location.tips.map((tip, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-700"
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
                  className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Mini map */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
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
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Google Maps
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
              <a
                href={`https://maps.apple.com/?daddr=${location.coordinates.lat},${location.coordinates.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Apple Maps
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            </div>
          </section>

          <p className="text-xs text-gray-400 mb-6">
            Last verified: {location.status.lastVerified}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
