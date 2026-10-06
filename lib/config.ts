// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tramo.dev";
export const EXPLORE_PAGE_SIZE = 10;
export const PAGE_SIZE = 10;
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30;

export const R2_PRIVATE_ORIGIN = process.env.NEXT_PUBLIC_R2_PRIVATE_ORIGIN
  ? new URL(process.env.NEXT_PUBLIC_R2_PRIVATE_ORIGIN).origin
  : "";
