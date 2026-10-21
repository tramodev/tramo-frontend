// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto grid min-h-svh w-full max-w-[110rem] lg:grid-cols-2">{children}</div>
}
