"use client"

import { useEffect, useRef } from "react"
import { LexicalReadOnly } from "./lexical-read-only"
import type { TitleAlign } from "@/app/editor/types"

const CAPTURE_WIDTH = 832;
const CAPTURE_HEIGHT = 1076;
const THUMBNAIL_WIDTH = 416;
const THUMBNAIL_HEIGHT = 538;

export function ThumbnailCapture({
  title,
  titleAlign,
  content,
  onCapture,
}: {
  title: string;
  titleAlign: TitleAlign;
  content: string;
  onCapture: (blob: Blob | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const timeout = setTimeout(async () => {
      if (!ref.current || cancelled) return;
      const objectUrls: string[] = [];
      try {
        const images = Array.from(ref.current.querySelectorAll("img")).filter(
          (img) => img.src.startsWith("http")
        );
        await Promise.allSettled(
          images.map(async (img) => {
            const response = await fetch(img.src, { mode: "cors", cache: "no-store" });
            if (!response.ok) return;
            const url = URL.createObjectURL(await response.blob());
            objectUrls.push(url);
            img.src = url;
          })
        );
        if (!ref.current || cancelled) return;
        const html2canvas = (await import("html2canvas")).default;
        const canvas = await html2canvas(ref.current, {
          width: CAPTURE_WIDTH,
          height: CAPTURE_HEIGHT,
          windowWidth: CAPTURE_WIDTH,
          backgroundColor: "#F6FAFE",
          scale: 1,
          // editor images live on R2 (cross-origin) — without this html2canvas
          // silently skips them and thumbnails lose their images
          useCORS: true,
        });

        const resized = document.createElement("canvas");
        resized.width = THUMBNAIL_WIDTH;
        resized.height = THUMBNAIL_HEIGHT;
        const ctx = resized.getContext("2d");
        ctx?.drawImage(canvas, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

        resized.toBlob((blob) => {
          if (!cancelled) onCapture(blob);
        }, "image/jpeg", 0.9);
      } catch (err) {
        console.error(err);
        if (!cancelled) onCapture(null);
      } finally {
        objectUrls.forEach((url) => URL.revokeObjectURL(url));
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [title, titleAlign, content, onCapture]);

  return (
    <div
      ref={ref}
      className="thumbnail-capture-content"
      style={{
        position: "fixed",
        top: -9999,
        left: -9999,
        width: CAPTURE_WIDTH,
        height: CAPTURE_HEIGHT,
        overflow: "hidden",
        padding: 32,
        ["--background" as string]: "#F6FAFE",
        ["--foreground" as string]: "#171C1F",
        ["--primary" as string]: "#00668B",
        ["--primary-foreground" as string]: "#FFFFFF",
        ["--secondary" as string]: "#D2E5F5",
        ["--muted" as string]: "#EAEEF2",
        ["--muted-foreground" as string]: "#41484D",
        ["--popover" as string]: "#FFFFFF",
        ["--border" as string]: "#C1C7CD",
        ["--input" as string]: "#71787E",
        background: "#F6FAFE",
        color: "#171C1F",
      }}
    >
      {title && (
        <h1 style={{ fontSize: 28, fontWeight: 500, marginBottom: 16, fontFamily: "inherit", textAlign: titleAlign }}>
          {title}
        </h1>
      )}
      <LexicalReadOnly content={content} />
    </div>
  );
}
