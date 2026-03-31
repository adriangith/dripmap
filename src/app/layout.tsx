import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "dripmap — Find Water Play Locations",
  description: "Discover waterfalls, swimming holes, splash pads, and more worldwide.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="h-full bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
