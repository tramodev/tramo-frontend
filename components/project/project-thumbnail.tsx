"use client"

import Image from "next/image"
import { initial } from "@/components/shared/author-avatar"

export function ProjectThumbnail({
  thumbnailImageUrl,
  title,
  className = "",
  placeholder,
}: {
  thumbnailImageUrl: string | null;
  title: string;
  className?: string;
  placeholder?: React.ReactNode;
}) {
  if (thumbnailImageUrl) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image src={thumbnailImageUrl} alt="" fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover object-top" />
      </div>
    )
  }
  return (
    <div className={`grid place-items-center overflow-hidden ${className}`}>
      {placeholder ?? <span className="font-display text-2xl font-medium text-primary">{initial(title)}</span>}
    </div>
  )
}
