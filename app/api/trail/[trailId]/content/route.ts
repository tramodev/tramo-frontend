// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { NextRequest, NextResponse } from 'next/server';
import { authenticatedFetch } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';


export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ trailId: string }> }
) {
  const { trailId } = await params;
  const response = await authenticatedFetch(`${API_BASE_URL}/api/trail/${trailId}/content`);
  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
