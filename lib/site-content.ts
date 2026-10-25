'use server';
import { backendFetch } from '@/lib/backend-fetch';

import { updateTag, revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { authenticatedFetch } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';
import { parseResponse } from '@/lib/http';
import { isAdmin } from '@/lib/session';

export interface BlogPostSummary {
  slug: string;
  title: string;
  summary: string;
  category: string;
  publishedDate: string;
}

export interface BlogPost extends BlogPostSummary {
  id: number;
  content: string;
  published: boolean;
}

export interface ChangelogEntry {
  id: number;
  title: string;
  content: string;
  published: boolean;
  publishedDate: string;
}

export interface RoadmapItem {
  id: number;
  title: string;
  description: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
  position: number;
  published: boolean;
}

export interface SiteContent {
  blog: BlogPost[];
  changelog: ChangelogEntry[];
  roadmap: RoadmapItem[];
}

export type ContentKind = keyof SiteContent;

async function publicContent(path: string): Promise<Response> {
  return backendFetch(`${API_BASE_URL}/api/public/content/${path}`, {
    cache: 'force-cache',
    next: { tags: ['site-content'], revalidate: 3600 },
  });
}

export async function getBlogPosts(): Promise<BlogPostSummary[]> {
  return parseResponse(await publicContent('blog'));
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const response = await publicContent(`blog/${encodeURIComponent(slug)}`);
  if (response.status === 404) return null;
  return parseResponse(response);
}

export async function getChangelog(): Promise<ChangelogEntry[]> {
  return parseResponse(await publicContent('changelog'));
}

export async function getRoadmap(): Promise<RoadmapItem[]> {
  return parseResponse(await publicContent('roadmap'));
}

export async function getAdminContent(): Promise<SiteContent> {
  if (!(await isAdmin())) throw new Error('Access denied');
  return parseResponse(await authenticatedFetch(`${API_BASE_URL}/api/admin/content`));
}

async function mutateContent(kind: ContentKind, id: number | null, method: string, body?: object): Promise<{ error: string | null }> {
  if (!(await isAdmin())) return { error: 'Access denied.' };
  if (!['blog', 'changelog', 'roadmap'].includes(kind) || (id !== null && (!Number.isSafeInteger(id) || id < 1))) {
    return { error: 'Invalid content.' };
  }
  let response: Response;
  try {
    response = await authenticatedFetch(`${API_BASE_URL}/api/admin/content/${kind}${id === null ? '' : `/${id}`}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body && { body: JSON.stringify(body) }),
    });
  } catch (error) {
    unstable_rethrow(error);
    return { error: 'Could not reach the server. Your changes have not been confirmed.' };
  }
  if (!response.ok) {
    if (response.status === 409) return { error: 'A blog post already uses this slug.' };
    if (response.status === 400) return { error: 'Check the fields. Published blog posts need content, and slugs must use lowercase letters, numbers and hyphens.' };
    return { error: 'Could not save the change. Please try again.' };
  }
  updateTag('site-content');
  revalidatePath('/admin/content');
  revalidatePath('/sitemap.xml');
  return { error: null };
}

export async function saveSiteContent(kind: ContentKind, id: number | null, form: FormData): Promise<{ error: string | null }> {
  const common = { title: form.get('title'), published: form.get('published') === 'on' };
  const body = kind === 'blog'
    ? { ...common, slug: form.get('slug'), summary: form.get('summary'), category: form.get('category'), content: form.get('content'), publishedDate: form.get('publishedDate') }
    : kind === 'changelog'
      ? { ...common, content: form.get('content'), publishedDate: form.get('publishedDate') }
      : { ...common, description: form.get('content'), status: form.get('status'), position: Number(form.get('position')) };
  return mutateContent(kind, id, id === null ? 'POST' : 'PUT', body);
}

export async function deleteSiteContent(kind: ContentKind, id: number): Promise<{ error: string | null }> {
  return mutateContent(kind, id, 'DELETE');
}
