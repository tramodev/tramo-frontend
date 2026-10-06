// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import Image from "next/image"

export function initial(username: string) {
  return username.charAt(0).toUpperCase()
}

export function AuthorAvatar({ username, avatar, size = 22 }: { username: string; avatar: string | null; size?: number }) {
  if (avatar) {
    return (
      <Image
        src={avatar}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
      />
    )
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-tertiary font-medium text-tertiary-foreground ${
        size > 22 ? "text-xs" : "text-[11px]"
      }`}
      style={{ width: size, height: size }}
    >
      {initial(username)}
    </span>
  )
}
