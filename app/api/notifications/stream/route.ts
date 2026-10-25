// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { backendFetch } from '@/lib/backend-fetch';
import { API_BASE_URL } from "@/lib/config";
import { getAccessToken, refreshAccessToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function open(token: string | null, signal: AbortSignal) {
  return backendFetch(`${API_BASE_URL}/api/notifications/stream`, {
    headers: { Accept: "text/event-stream", Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal,
  });
}

async function stream(request: Request) {
  let upstream = await open(await getAccessToken(), request.signal);

  if (upstream.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed === 'unavailable') return new Response(null, { status: 503 });
    if (refreshed) upstream = await open(await getAccessToken(), request.signal);
  }

  if (!upstream.ok || !upstream.body) {
    const headers = new Headers();
    const retryAfter = upstream.headers.get("Retry-After");
    if (retryAfter) headers.set("Retry-After", retryAfter);
    return new Response(null, { status: upstream.status, headers });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function GET(request: Request) {
  try {
    return await stream(request);
  } catch {
    return new Response(null, { status: request.signal.aborted ? 499 : 503 });
  }
}
