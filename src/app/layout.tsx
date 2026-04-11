import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="h-full text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
