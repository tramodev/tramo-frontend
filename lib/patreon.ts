// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';
import { authenticatedFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import { parseResponse } from "@/lib/http";
import type { SubscriptionStatus } from "@/lib/subscription";
import { cookies } from "next/headers";

export async function getPatreonAuthorizeUrl(): Promise<string> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/auth/patreon/connect`);
  const { authorizeUrl } = await parseResponse<{ authorizeUrl: string }>(response);
  const state = new URL(authorizeUrl).searchParams.get("state");
  if (!state) throw new Error("Missing Patreon state");
  (await cookies()).set("patreonState", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 15,
    path: "/api/auth/patreon/callback",
  });
  return authorizeUrl;
}

export async function syncPatreonSubscription(): Promise<SubscriptionStatus> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/subscription/patreon/sync`, { method: "POST" });
  return parseResponse<SubscriptionStatus>(response);
}
