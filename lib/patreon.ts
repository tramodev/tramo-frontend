// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';
import { authenticatedFetch } from "./api";
import { API_BASE_URL } from "./config";
import { parseResponse } from "./http";

export async function getPatreonAuthorizeUrl(): Promise<string> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/auth/patreon/connect`);
  const { authorizeUrl } = await parseResponse<{ authorizeUrl: string }>(response);
  return authorizeUrl;
}
