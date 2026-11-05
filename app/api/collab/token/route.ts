// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { NextRequest, NextResponse } from 'next/server';
import { authenticatedFetch } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';
import { readRequestBody } from '@/lib/request-body';

export async function POST(request: NextRequest) {
  const body = await readRequestBody(request);
  if (body instanceof Response) return body;
  const response = await authenticatedFetch(`${API_BASE_URL}/api/collab/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
