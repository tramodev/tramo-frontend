import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HistoryView } from '@/components/editor/history/history-view';
import { authenticatedFetch } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';
import { parseResponse } from '@/lib/http';
import { getCurrentProjectState, getProjectHistory, getProjectVersion } from '@/lib/project-history';

export const metadata: Metadata = { title: 'Version history', robots: { index: false, follow: false } };

export default async function ProjectHistoryPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${encodeURIComponent(projectId)}`, { cache: 'no-store' });
  if (response.status === 403 || response.status === 404) notFound();
  const { restoreEpoch } = await parseResponse<{ restoreEpoch: number }>(response);
  const [history, current] = await Promise.all([getProjectHistory(projectId), getCurrentProjectState(projectId)]);
  const latest = history.versions[0] ? await getProjectVersion(projectId, history.versions[0].id) : null;
  return <HistoryView projectId={projectId} restoreEpoch={restoreEpoch} initialHistory={history} current={current} latest={latest?.snapshot ?? null} />;
}
