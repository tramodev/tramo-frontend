export function initial(username: string) {
  return username.charAt(0).toUpperCase()
}

export function AuthorAvatar({ username, avatar, size = 22 }: { username: string; avatar: string | null; size?: number }) {
  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
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
