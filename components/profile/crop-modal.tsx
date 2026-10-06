// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { decodeGif, type DecodedGifFrame } from "@/lib/decode-gif"

const MAX_ZOOM = 3

type NaturalSize = { width: number; height: number }

export function CropModal({
  file,
  title,
  description,
  frameWidth,
  frameHeight,
  exportWidth,
  exportHeight,
  rounded,
  onCancel,
  onConfirm,
}: {
  file: File
  title: string
  description: string
  frameWidth: number
  frameHeight: number
  exportWidth: number
  exportHeight: number
  rounded: string
  onCancel: () => void
  onConfirm: (blob: Blob) => void
}) {
  const isGif = file.type === "image/gif"

  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [gifFrames, setGifFrames] = useState<DecodedGifFrame[] | null>(null)
  const [frameIndex, setFrameIndex] = useState(0)
  const [size, setSize] = useState<NaturalSize | null>(null)
  const [baseScale, setBaseScale] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [exporting, setExporting] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; origin: { x: number; y: number } } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (isGif) {
      let cancelled = false
      decodeGif(file).then((decoded) => {
        if (cancelled) return
        setGifFrames(decoded.frames)
        setSize({ width: decoded.width, height: decoded.height })
        setBaseScale(Math.max(frameWidth / decoded.width, frameHeight / decoded.height))
      })
      return () => {
        cancelled = true
      }
    }
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      setSize({ width: image.width, height: image.height })
      setBaseScale(Math.max(frameWidth / image.width, frameHeight / image.height))
      setImg(image)
    }
    image.src = objectUrl
    return () => URL.revokeObjectURL(objectUrl)
  }, [file, isGif, frameWidth, frameHeight])

  useEffect(() => {
    if (!gifFrames || gifFrames.length === 0) return
    let cancelled = false
    let index = 0
    let timeoutId: number
    function tick() {
      if (cancelled || !gifFrames) return
      setFrameIndex(index)
      index = (index + 1) % gifFrames.length
      timeoutId = window.setTimeout(tick, Math.max(gifFrames[index].delay, 20))
    }
    tick()
    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [gifFrames])

  useEffect(() => {
    if (!gifFrames || !size || !canvasRef.current) return
    const frame = gifFrames[frameIndex]
    if (!frame) return
    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return
    const scale = baseScale * zoom
    const drawWidth = size.width * scale
    const drawHeight = size.height * scale
    const drawX = frameWidth / 2 - drawWidth / 2 + position.x
    const drawY = frameHeight / 2 - drawHeight / 2 + position.y
    ctx.clearRect(0, 0, frameWidth, frameHeight)
    ctx.drawImage(frame.canvas, drawX, drawY, drawWidth, drawHeight)
  }, [gifFrames, frameIndex, baseScale, zoom, position, size, frameWidth, frameHeight])

  function clamp(pos: { x: number; y: number }, scale: number) {
    if (!size) return pos
    const width = size.width * scale
    const height = size.height * scale
    const maxX = Math.max(0, (width - frameWidth) / 2)
    const maxY = Math.max(0, (height - frameHeight) / 2)
    return {
      x: Math.min(maxX, Math.max(-maxX, pos.x)),
      y: Math.min(maxY, Math.max(-maxY, pos.y)),
    }
  }

  function handlePointerDown(event: React.PointerEvent) {
    dragRef.current = { startX: event.clientX, startY: event.clientY, origin: position }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!dragRef.current) return
    const { startX, startY, origin } = dragRef.current
    const next = { x: origin.x + (event.clientX - startX), y: origin.y + (event.clientY - startY) }
    setPosition(clamp(next, baseScale * zoom))
  }

  function handlePointerUp() {
    dragRef.current = null
  }

  function handleZoomChange(nextZoom: number) {
    setZoom(nextZoom)
    setPosition((pos) => clamp(pos, baseScale * nextZoom))
  }

  function exportRegion(k: number) {
    if (!size) return null
    const scale = baseScale * zoom
    const drawWidth = size.width * scale * k
    const drawHeight = size.height * scale * k
    return {
      drawWidth,
      drawHeight,
      drawX: (exportWidth) / 2 - drawWidth / 2 + position.x * k,
      drawY: (exportHeight) / 2 - drawHeight / 2 + position.y * k,
    }
  }

  async function handleConfirm() {
    if (!size) return
    const k = exportWidth / frameWidth

    if (gifFrames) {
      setExporting(true)
      const region = exportRegion(k)!
      const exportCanvas = document.createElement("canvas")
      exportCanvas.width = exportWidth
      exportCanvas.height = exportHeight
      const exportCtx = exportCanvas.getContext("2d")!

      const { default: GIF } = await import("gif.js")
      const gif = new GIF({ workers: 2, quality: 10, width: exportWidth, height: exportHeight, workerScript: "/gif.worker.js" })
      for (const frame of gifFrames) {
        exportCtx.clearRect(0, 0, exportWidth, exportHeight)
        exportCtx.drawImage(frame.canvas, region.drawX, region.drawY, region.drawWidth, region.drawHeight)
        gif.addFrame(exportCtx, { copy: true, delay: frame.delay })
      }
      gif.on("finished", (blob) => {
        setExporting(false)
        onConfirm(blob)
      })
      gif.render()
      return
    }

    if (!img) return
    const canvas = document.createElement("canvas")
    canvas.width = exportWidth
    canvas.height = exportHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const region = exportRegion(k)!
    ctx.drawImage(img, region.drawX, region.drawY, region.drawWidth, region.drawHeight)
    canvas.toBlob((blob) => blob && onConfirm(blob), "image/jpeg", 0.85)
  }

  const scale = baseScale * zoom
  const ready = gifFrames ? gifFrames.length > 0 : !!img

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="w-auto sm:max-w-none">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div
          className={`relative touch-none select-none overflow-hidden border bg-muted ${rounded}`}
          style={{ width: frameWidth, height: frameHeight, cursor: ready ? "grab" : "default" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {gifFrames ? (
            <canvas ref={canvasRef} width={frameWidth} height={frameHeight} className="absolute inset-0" />
          ) : (
            img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img.src}
                alt=""
                draggable={false}
                style={{
                  position: "absolute",
                  left: frameWidth / 2 - (img.width * scale) / 2 + position.x,
                  top: frameHeight / 2 - (img.height * scale) / 2 + position.y,
                  width: img.width * scale,
                  height: img.height * scale,
                  maxWidth: "none",
                }}
              />
            )
          )}
        </div>

        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(event) => handleZoomChange(Number(event.target.value))}
          style={{ width: frameWidth }}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={exporting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!ready || exporting}>
            {exporting ? "Processing…" : "Use photo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
