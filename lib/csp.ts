export const publicImageOrigins = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL
  ? [new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL).origin]
  : [];

const privateOrigin = process.env.NEXT_PUBLIC_R2_PRIVATE_ORIGIN
  ? new URL(process.env.NEXT_PUBLIC_R2_PRIVATE_ORIGIN).origin
  : "";

export function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `img-src 'self' data: blob: ${publicImageOrigins.join(" ")} ${privateOrigin}`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://www.google.com https://www.gstatic.com https://accounts.google.com`,
    "script-src-attr 'none'",
    "object-src 'none'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `connect-src 'self' https://accounts.google.com ${privateOrigin} https://*.r2.cloudflarestorage.com`,
    "frame-src https://accounts.google.com https://www.google.com https://www.youtube-nocookie.com https://platform.twitter.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
