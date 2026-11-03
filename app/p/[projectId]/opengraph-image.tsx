// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { ImageResponse } from "next/og"
import { getPublicProject } from "@/lib/public-project"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const project = await getPublicProject(projectId)
  const title = project?.title ?? "Tramo"
  const description = project?.description
  const modified = project
    ? new Date(project.modifiedDate).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }) + " UTC"
    : ""

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#1A1A1A",
          padding: 56,
          fontFamily: "sans-serif",
        }}
      >
        {project && (
          <div style={{ display: "flex", fontSize: 28, color: "#A3A3A3" }}>
            @{project.ownerUsername}
          </div>
        )}
        <div style={{ display: "flex", fontSize: 72, fontWeight: 600, color: "#FFFFFF", lineHeight: 1.1, marginTop: 8 }}>
          {title.length > 70 ? `${title.slice(0, 67)}...` : title}
        </div>
        {description && (
          <div style={{ display: "flex", fontSize: 32, color: "#A3A3A3", lineHeight: 1.3, marginTop: 24 }}>
            {description.length > 180 ? `${description.slice(0, 177)}...` : description}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", marginTop: "auto" }}>
          <div
            style={{
              display: "flex",
              width: 56,
              height: 56,
              borderRadius: "50%",
              backgroundColor: "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 16,
            }}
          >
            <svg width={38} height={38} viewBox="0 0 32 32">
              <path d="M16 29 L16 16 Q16 10 21.5 8.5" fill="none" stroke="#1A1A1A" strokeWidth="4.2" strokeLinecap="round" />
              <path d="M16 21 Q16 16.5 11 15.5" fill="none" stroke="#1A1A1A" strokeWidth="4.2" strokeLinecap="round" />
              <circle cx="25" cy="7.5" r="4.4" fill="#1A1A1A" />
              <circle cx="7.5" cy="14.5" r="3.4" fill="none" stroke="#1A1A1A" strokeWidth="3.8" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 600, color: "#FFFFFF" }}>Tramo</div>
          {project && (
            <div style={{ display: "flex", fontSize: 28, color: "#A3A3A3", marginLeft: "auto" }}>{modified}</div>
          )}
        </div>
      </div>
    ),
    { ...size }
  )
}
