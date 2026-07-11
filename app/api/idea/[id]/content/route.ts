import { NextRequest, NextResponse } from 'next/server';
import { authenticatedFetch } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';

// Proxies idea content (which can carry embedded base64 images) to the backend.
// Routed through here instead of a Server Action because Server Action calls are
// capped at a 1MB argument payload — a Route Handler has no such limit.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const response = await authenticatedFetch(`${API_BASE_URL}/api/idea/${id}/content`);
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
  const body = await request.text();
  const response = await authenticatedFetch(`${API_BASE_URL}/api/idea/${id}/content`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  return new NextResponse(null, { status: response.status });
}
