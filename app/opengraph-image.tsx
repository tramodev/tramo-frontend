// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { ImageResponse } from "next/og"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1A1A1A",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 96,
            height: 96,
            borderRadius: "50%",
            backgroundColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <svg width={64} height={64} viewBox="0 0 32 32">
            <path d="M16 29 L16 16 Q16 10 21.5 8.5" fill="none" stroke="#1A1A1A" strokeWidth="4.2" strokeLinecap="round" />
            <path d="M16 21 Q16 16.5 11 15.5" fill="none" stroke="#1A1A1A" strokeWidth="4.2" strokeLinecap="round" />
            <circle cx="25" cy="7.5" r="4.4" fill="#1A1A1A" />
            <circle cx="7.5" cy="14.5" r="3.4" fill="none" stroke="#1A1A1A" strokeWidth="3.8" />
          </svg>
        </div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 600, color: "#FFFFFF" }}>
          Tramo
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#A3A3A3", marginTop: 16 }}>
          Collect, connect, and retrace your thinking
        </div>
      </div>
    ),
    { ...size }
  )
}
