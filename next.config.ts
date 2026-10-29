// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { NextConfig } from "next";
import { publicImageOrigins } from "./lib/csp";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.PLAYWRIGHT_TEST === '1' ? '.next/e2e' : '.next',
  experimental: {
    agentUpgrade: "security",
  },
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
