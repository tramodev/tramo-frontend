// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { cache } from "react";
import { isAdmin as fetchIsAdmin } from "./auth";

export const isAdmin = cache(fetchIsAdmin);
