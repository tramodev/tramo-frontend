import { NextRequest, NextResponse } from 'next/server';
import { authenticatedFetch } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.projectId !== 'string' || typeof body.publicRead !== 'boolean'
      || !Array.isArray(body.imageIds) || body.imageIds.length < 1 || body.imageIds.length > 100
      || body.imageIds.some((id: unknown) => typeof id !== 'string')
      || (body.snapshotId != null && (!Number.isSafeInteger(body.snapshotId) || body.snapshotId <= 0))) {
    return NextResponse.json({ message: 'Invalid image request' }, { status: 400 });
  }
  const prefix = body.publicRead ? '/api/public/project' : '/api/project';
  const response = await authenticatedFetch(`${API_BASE_URL}${prefix}/${encodeURIComponent(body.projectId)}/editor-images/resolve`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
    body: JSON.stringify({ imageIds: body.imageIds, snapshotId: body.snapshotId }),
  });
  return new NextResponse(await response.text(), {
    status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
  });
}
