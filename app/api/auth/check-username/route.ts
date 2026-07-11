import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/config';

// Public endpoint (no auth), proxied so the browser doesn't need CORS
// configured on the backend for a plain client-side fetch.
export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');
  if (!username) {
    return NextResponse.json({ available: false }, { status: 400 });
  }
  const response = await fetch(
    `${API_BASE_URL}/api/auth/check-username?username=${encodeURIComponent(username)}`
  );
  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
