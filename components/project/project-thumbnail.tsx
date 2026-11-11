"use client"

import Image from "next/image"
import { useState } from "react"
import { initial } from "@/components/shared/author-avatar"

export function ProjectThumbnail({
  thumbnailImageUrl,
  title,
  className = "",
  placeholder,
  loading = "lazy",
  contain = false,
}: {
  thumbnailImageUrl: string | null;
  title: string;
  className?: string;
  placeholder?: React.ReactNode;
  loading?: "eager" | "lazy";
  contain?: boolean;
}) {
  const [ratio, setRatio] = useState(0)
  if (thumbnailImageUrl && contain) {
    return (
      <div className={`grid place-items-center overflow-hidden [container-type:size] ${className}`}>
        <div
          className="relative overflow-hidden rounded-sm"
          style={ratio ? { width: `min(100cqw, ${ratio * 100}cqh)`, aspectRatio: ratio } : { width: "100%", height: "100%" }}
        >
          <Image
            src={thumbnailImageUrl}
            alt=""
            fill
            loading={loading}
            sizes="(max-width: 768px) 100vw, 400px"
            onLoad={(event) => setRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)}
            className="object-contain"
          />
        </div>
      </div>
    )
  }
  if (thumbnailImageUrl) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image src={thumbnailImageUrl} alt="" fill loading={loading} sizes="(max-width: 768px) 100vw, 400px" className="object-cover object-top" />
      </div>
    )
  }
  return (
    <div className={`grid place-items-center overflow-hidden ${className}`}>
      {placeholder ?? <span className="font-display text-2xl font-medium text-primary">{initial(title)}</span>}
    </div>
  )
}
