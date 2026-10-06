// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { parseGIF, decompressFrames } from "gifuct-js"

export interface DecodedGifFrame {
  canvas: HTMLCanvasElement
  delay: number
}

export interface DecodedGif {
  width: number
  height: number
  frames: DecodedGifFrame[]
}

export async function decodeGif(file: File): Promise<DecodedGif> {
  const buffer = await file.arrayBuffer()
  const parsed = parseGIF(buffer)
  const rawFrames = decompressFrames(parsed, true)

  const width = parsed.lsd.width
  const height = parsed.lsd.height
  const composite = document.createElement("canvas")
  composite.width = width
  composite.height = height
  const compositeCtx = composite.getContext("2d")!
  const patch = document.createElement("canvas")
  const patchCtx = patch.getContext("2d")!

  const frames: DecodedGifFrame[] = []

  for (const frame of rawFrames) {
    const { dims } = frame
    const before = frame.disposalType === 3 ? compositeCtx.getImageData(0, 0, width, height) : null

    patch.width = dims.width
    patch.height = dims.height
    const patchImageData = patchCtx.createImageData(dims.width, dims.height)
    patchImageData.data.set(frame.patch)
    patchCtx.putImageData(patchImageData, 0, 0)
    compositeCtx.drawImage(patch, dims.left, dims.top)

    const snapshot = document.createElement("canvas")
    snapshot.width = width
    snapshot.height = height
    snapshot.getContext("2d")!.drawImage(composite, 0, 0)
    frames.push({ canvas: snapshot, delay: frame.delay || 100 })

    if (frame.disposalType === 2) {
      compositeCtx.clearRect(dims.left, dims.top, dims.width, dims.height)
    } else if (before) {
      compositeCtx.putImageData(before, 0, 0)
    }
  }

  return { width, height, frames }
}
