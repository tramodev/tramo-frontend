import type { NextConfig } from "next";

const R2_PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ??
  "https://pub-809332af245f4f50954cd6523674cc35.r2.dev";
const r2Hostname = new URL(R2_PUBLIC_BASE_URL).hostname;

const privateOrigin = process.env.NEXT_PUBLIC_R2_PRIVATE_ORIGIN ?? "";

const csp = [
  "default-src 'self'",
  `img-src 'self' data: blob: ${R2_PUBLIC_BASE_URL} ${privateOrigin}`,
  "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://accounts.google.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `connect-src 'self' https://accounts.google.com ${privateOrigin} https://*.r2.cloudflarestorage.com`,
  "frame-src https://accounts.google.com https://www.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: r2Hostname,
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
