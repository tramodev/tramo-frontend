// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import Image, { type StaticImageData } from "next/image"
import { cn } from "@/lib/utils"

export function AuthPoster({
  title,
  subtitle,
  image,
  className,
}: {
  title: string
  subtitle: string
  image: StaticImageData
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative m-4 hidden flex-col justify-end overflow-hidden rounded-[28px] p-16 lg:flex lg:sticky lg:top-4 lg:h-[calc(100svh-2rem)] text-scrim-foreground",
        className,
      )}
    >
      <div className="absolute inset-0">
        <Image src={image} alt="" fill placeholder="blur" sizes="50vw" className="object-cover" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-scrim/70 from-10% to-transparent" />
      <div className="relative">
        <div className="font-display text-5xl font-normal leading-[1.12]">{title}</div>
        <div className="mt-2 text-xl font-normal leading-snug">{subtitle}</div>
      </div>
    </div>
  )
}

