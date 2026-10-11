import { NextRequest, NextResponse } from 'next/server';
import { authenticatedFetch } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const query = new URLSearchParams();
  for (const key of ['noteId', 'trailId']) {
    const value = request.nextUrl.searchParams.get(key);
    if (value && /^\d+$/.test(value)) query.set(key, value);
  }
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${encodeURIComponent(projectId)}/editor${query.size ? `?${query}` : ''}`);
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
  });
}
