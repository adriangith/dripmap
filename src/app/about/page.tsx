import { Droplets } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "About — dripmap",
  description: "Learn about dripmap and how we curate water play locations.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header showSearch={false} />

      <main className="flex-1 max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-6">
          <Droplets className="w-10 h-10 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">About dripmap</h1>
        </div>

        <div className="space-y-4 text-gray-700 leading-relaxed">
          <p>
            dripmap helps you discover water play locations around the world —
            waterfalls, swimming holes, splash pads, springs, and creeks.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 pt-4">
            How it works
          </h2>
          <p>
            Every location on dripmap is editorially curated. We verify details
            like accessibility, parking, status, and seasonal availability so
            you can plan your visit with confidence.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 pt-4">
            Offline access
          </h2>
          <p>
            dripmap works offline. Once you&apos;ve loaded the app, location data is
            cached on your device. Bookmark your favorites and the details will
            be available even without cell service — perfect for remote
            waterfalls and backcountry swimming holes.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 pt-4">
            Suggest a location
          </h2>
          <p>
            Know a great water play spot that&apos;s not on dripmap yet? We&apos;d love
            to hear about it. Reach out and we&apos;ll review it for inclusion.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
