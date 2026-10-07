import { authenticatedFetch } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string; id: string }> }) {
  const { projectId, id } = await params;
  if (!/^[a-zA-Z0-9]+$/.test(projectId) || !/^\d+$/.test(id)) return new Response(null, { status: 400 });
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${projectId}/item/${id}/extract`);
  return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string; id: string }> }) {
  const { projectId, id } = await params;
  if (!/^[a-zA-Z0-9]+$/.test(projectId) || !/^\d+$/.test(id)) return new Response(null, { status: 400 });
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${projectId}/item/${id}/extract`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: await request.text(),
  });
  return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' } });
}
