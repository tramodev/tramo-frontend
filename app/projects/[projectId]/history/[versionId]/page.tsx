import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicProjectView } from '@/components/project/public-project-view';
import { SidebarProvider } from '@/components/ui/sidebar';
import { authenticatedFetch } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';
import { parseResponse } from '@/lib/http';
import { getMyProfile } from '@/lib/profile';
import { getProjectVersion } from '@/lib/project-history';
import type { PublicItem } from '@/lib/public-project';

export const metadata: Metadata = { title: 'Project version preview', robots: { index: false, follow: false } };

export default async function ProjectVersionPage({ params }: { params: Promise<{ projectId: string; versionId: string }> }) {
  const { projectId, versionId } = await params;
  const id = Number(versionId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const [detail, response, profile] = await Promise.all([
    getProjectVersion(projectId, id),
    authenticatedFetch(`${API_BASE_URL}/api/project/${encodeURIComponent(projectId)}`, { cache: 'no-store' }),
    getMyProfile(),
  ]);
  if (!detail || !profile || response.status === 403 || response.status === 404) notFound();
  const { restoreEpoch } = await parseResponse<{ restoreEpoch: number }>(response);
  const { snapshot, version } = detail;
  const items = new Map(snapshot.items.map(item => [item.id, {
    id: String(item.id), title: item.title, type: item.type ?? null, content: item.content ?? '', titleAlign: item.titleAlign ?? 'center',
  } satisfies PublicItem]));
  const linkedIds = new Set(snapshot.trails.flatMap(trail => trail.itemIds));
  const project = {
    id: projectId, title: snapshot.title, description: snapshot.description, ownerUsername: profile.username,
    trails: snapshot.trails.map(trail => ({
      id: String(trail.id), title: trail.title, description: trail.description ?? '', version: 1,
      forkedFromId: trail.forkedFromId == null ? null : String(trail.forkedFromId),
      items: trail.itemIds.map(itemId => items.get(itemId)!),
    })),
    looseItems: snapshot.items.filter(item => !linkedIds.has(item.id)).map(item => items.get(item.id)!),
  };

  return <SidebarProvider style={{ '--sidebar-width': '288px', '--sidebar-width-icon': '272px' } as React.CSSProperties} className="h-screen min-h-0">
    <PublicProjectView project={project} historyVersion={{ ...version, restoreEpoch }} homeHref="/projects" isLoggedIn isOwnProject username={profile.username} imageUrl={profile.imageUrl ?? null} />
  </SidebarProvider>;
}
