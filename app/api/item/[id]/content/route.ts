import { NextRequest, NextResponse } from 'next/server';
import { authenticatedFetch } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';


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
  const body = await request.text();
  const response = await authenticatedFetch(`${API_BASE_URL}/api/item/${id}/content`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  return new NextResponse(null, { status: response.status });
}
