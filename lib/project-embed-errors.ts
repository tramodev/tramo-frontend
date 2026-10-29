import { noteEmbedErrors, type EmbedError } from '@/app/editor/embed-validity';
import { getItemContent } from '@/lib/item-content-client';
import type { Item } from '@/app/editor/types';

export interface ProjectEmbedError extends EmbedError {
  itemId: string;
}

export async function projectEmbedErrors(items: Record<string, Item>, contents = new Map<string, Promise<string>>()): Promise<ProjectEmbedError[]> {
  const errors: ProjectEmbedError[] = [];
  for (const item of Object.values(items)) {
    let content = item.content;
    if (content === null) {
      let loaded = contents.get(item.id);
      if (!loaded) {
        loaded = getItemContent(item.id);
        contents.set(item.id, loaded);
        void loaded.catch(() => { if (contents.get(item.id) === loaded) contents.delete(item.id); });
      }
      content = await loaded;
    }
    for (const error of await noteEmbedErrors(content)) errors.push({ ...error, itemId: item.id });
  }
  return errors;
}

export function embedReviewUrl(projectId: string, error: ProjectEmbedError): string {
  return `/editor/${encodeURIComponent(projectId)}?note=${encodeURIComponent(error.itemId)}&embed=${error.index}`;
}
