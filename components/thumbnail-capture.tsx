"use client"

import { useEffect, useRef } from "react"
import { LexicalReadOnly } from "./lexical-read-only"

// Wide enough that headings/paragraphs render at their normal reading size
// (matches the public reading view's content column) instead of looking
// artificially zoomed-in inside a narrow box.
const CAPTURE_WIDTH = 820;
const CAPTURE_HEIGHT = 620;
// Final thumbnail is downscaled from the capture above, same "render full
// page, then shrink" approach Google Drive uses for its doc previews.
const THUMBNAIL_WIDTH = 480;
const THUMBNAIL_HEIGHT = Math.round((CAPTURE_HEIGHT / CAPTURE_WIDTH) * THUMBNAIL_WIDTH);

// Mounts the first idea's content off-screen, waits a beat for Lexical (and any
// images in it) to paint, then rasterizes it with html2canvas — same trick
// Google Drive uses for doc thumbnails, just done client-side since there's no
// headless-browser infra on this (Java) backend to render it server-side.
export function ThumbnailCapture({
  content,
  onCapture,
}: {
  content: string;
  onCapture: (dataUrl: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const timeout = setTimeout(async () => {
      if (!ref.current || cancelled) return;
      try {
        const html2canvas = (await import("html2canvas")).default;
        const canvas = await html2canvas(ref.current, {
          width: CAPTURE_WIDTH,
          height: CAPTURE_HEIGHT,
          windowWidth: CAPTURE_WIDTH,
          backgroundColor: "#f3f2f2",
          scale: 1,
        });

        const resized = document.createElement("canvas");
        resized.width = THUMBNAIL_WIDTH;
        resized.height = THUMBNAIL_HEIGHT;
        const ctx = resized.getContext("2d");
        ctx?.drawImage(canvas, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

        if (!cancelled) onCapture(resized.toDataURL("image/jpeg", 0.75));
      } catch (err) {
        console.error(err);
        if (!cancelled) onCapture(null);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [content, onCapture]);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: -9999,
        left: -9999,
        width: CAPTURE_WIDTH,
        height: CAPTURE_HEIGHT,
        overflow: "hidden",
        padding: 32,
        // Pins every themed color to its light-mode value regardless of the
        // viewer's current theme — Editor.css reads these as CSS custom
        // properties, and inheriting dark-mode text-on-white was exactly
        // what made the previous capture unreadable (light text, forced
        // white background).
        ["--color-bg" as string]: "#f3f2f2",
        ["--color-text" as string]: "#201e1d",
        ["--color-accent" as string]: "#4338ca",
        ["--color-accent-600" as string]: "#3730a3",
        ["--color-accent-700" as string]: "#2a2280",
        ["--color-neutral-100" as string]: "#f8f4f4",
        ["--color-neutral-200" as string]: "#eae7e7",
        ["--color-neutral-300" as string]: "#d7d3d3",
        ["--color-neutral-400" as string]: "#bab6b6",
        ["--color-neutral-500" as string]: "#9b9797",
        ["--color-neutral-600" as string]: "#7d7979",
        ["--color-neutral-700" as string]: "#605d5d",
        ["--color-neutral-800" as string]: "#444141",
        ["--color-neutral-900" as string]: "#2d2b2b",
        ["--color-divider" as string]: "rgba(32, 30, 29, 0.4)",
        background: "#f3f2f2",
        color: "#201e1d",
      }}
    >
      <LexicalReadOnly content={content} />
    </div>
  );
}
