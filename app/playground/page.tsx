// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { Metadata } from "next"
import { PlaygroundEditor } from "@/app/playground/playground-editor"

export const metadata: Metadata = {
  title: "Playground",
  description: "Try the Tramo editor without an account. Write notes, build trails and see them on the map.",
  alternates: { canonical: "/playground" },
}

export default function PlaygroundPage() {
  return <PlaygroundEditor />
}
