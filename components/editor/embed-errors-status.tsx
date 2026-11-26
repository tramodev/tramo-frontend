"use client";

import { useEffect, useRef, useState } from 'react';
import type { Item } from '@/app/editor/types';
import { projectEmbedErrors, type ProjectEmbedError } from '@/lib/project-embed-errors';

export function EmbedErrorsStatus({ items, onReview }: { items: Record<string, Item>; onReview: (error: ProjectEmbedError) => void }) {
  const contents = useRef(new Map<string, Promise<string>>());
  const [result, setResult] = useState<{ errors: ProjectEmbedError[]; failed?: boolean } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void projectEmbedErrors(items, contents.current).then(errors => {
        if (!cancelled) setResult({ errors });
      }).catch(() => {
        if (!cancelled) setResult({ errors: [], failed: true });
      });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [items]);
  if (!result) return null;
  if (result.failed) return <span role="status" className="text-xs text-muted-foreground">Could not check equations, graphs and music scores</span>;
  if (!result.errors.length) return null;
  const label = ([['equation', 'equation', 'equations'], ['graph', 'graph', 'graphs'], ['music', 'music score', 'music scores']] as const)
    .map(([type, one, many]) => [result.errors.filter(error => error.type === type).length, one, many] as const)
    .filter(([count]) => count)
    .map(([count, one, many]) => `${count} ${count === 1 ? one : many} with errors`).join(' · ');
  return <span role="status"><button type="button" className="max-w-56 whitespace-normal text-left text-xs text-destructive underline" onClick={() => onReview(result.errors[0])}>{label}</button></span>;
}
