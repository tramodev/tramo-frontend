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

const FRAME_SIZE = 320
const EXPORT_SIZE = 256
const MAX_ZOOM = 3

export function AvatarCropModal({
  file,
  onCancel,
  onConfirm,
}: {
  file: File
  onCancel: () => void
  onConfirm: (dataUrl: string) => void
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [baseScale, setBaseScale] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ startX: number; startY: number; origin: { x: number; y: number } } | null>(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      setBaseScale(Math.max(FRAME_SIZE / image.width, FRAME_SIZE / image.height))
      setImg(image)
    }
    image.src = objectUrl
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  function clamp(pos: { x: number; y: number }, scale: number) {
    if (!img) return pos
    const width = img.width * scale
    const height = img.height * scale
    const maxX = Math.max(0, (width - FRAME_SIZE) / 2)
    const maxY = Math.max(0, (height - FRAME_SIZE) / 2)
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

  function handleConfirm() {
    if (!img) return
    const canvas = document.createElement("canvas")
    canvas.width = EXPORT_SIZE
    canvas.height = EXPORT_SIZE
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const k = EXPORT_SIZE / FRAME_SIZE
    const scale = baseScale * zoom
    const drawWidth = img.width * scale * k
    const drawHeight = img.height * scale * k
    const drawX = EXPORT_SIZE / 2 - drawWidth / 2 + position.x * k
    const drawY = EXPORT_SIZE / 2 - drawHeight / 2 + position.y * k
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
    onConfirm(canvas.toDataURL("image/jpeg", 0.85))
  }

  const scale = baseScale * zoom

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="w-auto">
        <DialogHeader>
          <DialogTitle>Crop avatar</DialogTitle>
          <DialogDescription>Drag to reposition, use the slider to zoom.</DialogDescription>
        </DialogHeader>

        <div
          className="relative touch-none select-none overflow-hidden rounded-md border"
          style={{ width: FRAME_SIZE, height: FRAME_SIZE, background: "var(--color-neutral-200)", cursor: img ? "grab" : "default" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img.src}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                left: FRAME_SIZE / 2 - (img.width * scale) / 2 + position.x,
                top: FRAME_SIZE / 2 - (img.height * scale) / 2 + position.y,
                width: img.width * scale,
                height: img.height * scale,
                maxWidth: "none",
              }}
            />
          )}
        </div>

        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(event) => handleZoomChange(Number(event.target.value))}
          style={{ width: FRAME_SIZE }}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!img}>
            Use photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
