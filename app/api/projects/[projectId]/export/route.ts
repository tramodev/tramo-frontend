import { API_BASE_URL } from '@/lib/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!/^[a-zA-Z0-9]+$/.test(projectId)) return new Response(null, { status: 400 });
  const open = async () => {
    const token = await getAccessToken();
    if (!token) return new Response(null, { status: 401 });
    return fetch(`${API_BASE_URL}/api/project/${projectId}/export`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: request.signal,
    });
  };
  let upstream = await open();
  if (upstream.status === 401 && await refreshAccessToken()) upstream = await open();
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      'Content-Disposition': upstream.headers.get('Content-Disposition') ?? '',
      'Cache-Control': 'private, no-store',
      ...(upstream.headers.get('Content-Length') ? { 'Content-Length': upstream.headers.get('Content-Length')! } : {}),
    },
  });
}
