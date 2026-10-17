// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { NextRequest, NextResponse } from 'next/server';
import { authenticatedFetch } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';
import { readRequestBody } from '@/lib/request-body';


export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const response = await authenticatedFetch(`${API_BASE_URL}/api/item/${id}/content`);
  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await readRequestBody(request);
  if (body instanceof Response) return body;
  const response = await authenticatedFetch(`${API_BASE_URL}/api/item/${id}/content`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Project-Epoch': request.headers.get('X-Project-Epoch') ?? '0', ...(request.headers.get('X-Project-Id') ? { 'X-Project-Id': request.headers.get('X-Project-Id')! } : {}) },
    body,
  });
  return new NextResponse(response.status === 204 ? null : await response.text(), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
