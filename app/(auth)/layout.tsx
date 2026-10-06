// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-svh lg:grid-cols-2">{children}</div>
}
