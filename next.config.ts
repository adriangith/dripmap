import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// next-pwa generates public/sw.js during next build, but scripts/generate-sw.ts
// overwrites it post-build with the correct Workbox config. The workboxOptions
// here are intentionally omitted — they would be overwritten anyway.
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  turbopack: {},
  allowedDevOrigins: ["192.168.5.18"],
};

export default withPWA(nextConfig);
