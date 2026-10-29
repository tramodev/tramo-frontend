"use client";

import { useEffect, useRef, useState } from 'react';
import type { Item } from '@/app/editor/types';
import { projectEmbedErrors, type ProjectEmbedError } from '@/lib/project-embed-errors';

export function EmbedErrorsStatus({ items, onReview }: { items: Record<string, Item>; onReview: (error: ProjectEmbedError) => void }) {
  const contents = useRef(new Map<string, Promise<string>>());
  const [result, setResult] = useState<{ items: Record<string, Item>; errors: ProjectEmbedError[]; failed?: boolean } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void projectEmbedErrors(items, contents.current).then(errors => {
        if (!cancelled) setResult({ items, errors });
      }).catch(() => {
        if (!cancelled) setResult({ items, errors: [], failed: true });
      });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [items]);
  if (!result || result.items !== items) return <span role="status" className="text-xs text-muted-foreground">Checking equations and music scores…</span>;
  if (result.failed) return <span role="status" className="text-xs text-muted-foreground">Could not check equations and music scores</span>;
  if (!result.errors.length) return null;
  const equations = result.errors.filter(error => error.type === 'equation').length;
  const scores = result.errors.length - equations;
  const label = [equations ? `${equations} ${equations === 1 ? 'equation' : 'equations'} with errors` : '', scores ? `${scores} music ${scores === 1 ? 'score' : 'scores'} with errors` : ''].filter(Boolean).join(' · ');
  return <span role="status"><button type="button" className="max-w-56 whitespace-normal text-left text-xs text-destructive underline" onClick={() => onReview(result.errors[0])}>{label}</button></span>;
}
