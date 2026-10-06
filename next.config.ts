// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { NextConfig } from "next";

const publicImageOrigins = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL
  ? [new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL).origin]
  : [];

const privateOrigin = process.env.NEXT_PUBLIC_R2_PRIVATE_ORIGIN
  ? new URL(process.env.NEXT_PUBLIC_R2_PRIVATE_ORIGIN).origin
  : "";

const csp = [
  "default-src 'self'",
  `img-src 'self' data: blob: ${publicImageOrigins.join(" ")} ${privateOrigin}`,
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://www.google.com https://www.gstatic.com https://accounts.google.com`,
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
    remotePatterns: publicImageOrigins.map((origin) => ({
      protocol: "https" as const,
      hostname: new URL(origin).hostname,
    })),
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
