import { NextResponse } from 'next/server';
import { authenticatedFetch } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';
import { readRequestBody } from '@/lib/request-body';

export async function POST(request: Request) {
  const body = await readRequestBody(request);
  if (body instanceof Response) return body;
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/draft-commit`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
  });
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' };
  const retryAfter = response.headers.get('Retry-After');
  if (retryAfter) headers['Retry-After'] = retryAfter;
  return new NextResponse(await response.text(), { status: response.status, headers });
}
