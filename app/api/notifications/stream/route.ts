// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { API_BASE_URL } from "@/lib/config";
import { getAccessToken, refreshAccessToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function open(token: string | null, signal: AbortSignal) {
  return fetch(`${API_BASE_URL}/api/notifications/stream`, {
    headers: { Accept: "text/event-stream", Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal,
  });
}

export async function GET(request: Request) {
  let upstream = await open(await getAccessToken(), request.signal);

  if (upstream.status === 401 && (await refreshAccessToken())) {
    upstream = await open(await getAccessToken(), request.signal);
  }

  if (!upstream.ok || !upstream.body) {
    return new Response(null, { status: upstream.status });
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
