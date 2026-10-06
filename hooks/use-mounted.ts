// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import * as React from "react"

const subscribe = () => () => {}

export function useMounted() {
  return React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
