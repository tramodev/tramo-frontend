// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
declare module "gif.js" {
  export interface GIFOptions {
    workers?: number
    workerScript?: string
    quality?: number
    width?: number
    height?: number
    repeat?: number
    background?: string
    transparent?: string | null
    dither?: boolean
  }

  export interface AddFrameOptions {
    delay?: number
    copy?: boolean
  }

  export default class GIF {
    constructor(options?: GIFOptions)
    addFrame(
      image: CanvasImageSource | CanvasRenderingContext2D | ImageData,
      options?: AddFrameOptions
    ): void
    on(event: "finished", callback: (blob: Blob, data: Uint8Array) => void): void
    on(event: "progress", callback: (progress: number) => void): void
    on(event: "start" | "abort", callback: () => void): void
    render(): void
    abort(): void
  }
}
