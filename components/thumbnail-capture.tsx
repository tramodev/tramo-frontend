"use client"

import { useEffect, useRef } from "react"
import { LexicalReadOnly } from "./lexical-read-only"

const CAPTURE_WIDTH = 820;
const CAPTURE_HEIGHT = 620;
const THUMBNAIL_WIDTH = 480;
const THUMBNAIL_HEIGHT = Math.round((CAPTURE_HEIGHT / CAPTURE_WIDTH) * THUMBNAIL_WIDTH);

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
