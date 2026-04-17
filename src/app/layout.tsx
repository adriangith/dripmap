import type { Metadata, Viewport } from "next";
import { Merriweather } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Providers from "@/components/Providers";
import "./globals.css";

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-merriweather",
});

export const metadata: Metadata = {
  title: "Drift — Discover Summer Activities",
  description: "Discover beaches, events, swims, and more across Victoria.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Drift",
  },
  other: {
    // Next.js 15+ emits mobile-web-app-capable instead of the Apple-specific
    // tag, but iOS requires apple-mobile-web-app-capable for status bar
    // styling and standalone mode to work.
    "apple-mobile-web-app-capable": "yes",
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${merriweather.variable} dark:bg-gray-950`}>
      <body className="h-full text-gray-900 dark:text-gray-100 dark:bg-gray-950 antialiased">
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
