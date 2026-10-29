import katex from 'katex';
import { loadAbcjs } from '@/app/editor/plugins/music-audio';

export const KATEX_OPTS = { throwOnError: true, trust: false, strict: 'warn', maxExpand: 1000, maxSize: 50, output: 'html' } as const;
const equations = new Map<string, string | null>();
const scores = new Map<string, Promise<string | null>>();

function remember<T>(cache: Map<string, T>, source: string, value: T): T {
  cache.delete(source);
  cache.set(source, value);
  if (cache.size > 200) cache.delete(cache.keys().next().value!);
  return value;
}

export function equationError(source: string, inline = false): string | null {
  const key = `${inline ? 'inline' : 'block'}:${source}`;
  if (equations.has(key)) return remember(equations, key, equations.get(key)!);
  let error: string | null = null;
  try {
    if (source.length > 10000) throw new Error('Equations must not exceed 10,000 characters.');
    katex.renderToString(source, { ...KATEX_OPTS, displayMode: !inline });
  } catch (failure) {
    error = (failure instanceof Error ? failure.message : String(failure)).replace(/^KaTeX parse error:\s*/, '');
  }
  return remember(equations, key, error);
}

export function plainMusicWarning(warning: string): string {
  const ignored = /^(Music Line:\d+:\d+: Unknown character ignored:)\s+.*?<span\b[^>]*>(.*?)<\/span>/.exec(warning);
  if (ignored) warning = `${ignored[1]} ${ignored[2]}`;
  const entities: Record<string, string> = { '&lt;': '<', '&gt;': '>', '&amp;': '&' };
  return warning.replace(/<\/?span\b[^>]*>|&(?:lt|gt|amp);/g, token => entities[token] ?? '');
}

export function musicError(source: string): Promise<string | null> {
  const cached = scores.get(source);
  if (cached) return remember(scores, source, cached);
  const result = (async () => {
    if (source.length > 10000) return 'Music scores must not exceed 10,000 characters.';
    const abcjs = await loadAbcjs();
    try {
      const [tune] = abcjs.parseOnly(source);
      const warnings = (tune?.warnings ?? []).map(plainMusicWarning);
      return warnings.length ? warnings.join('\n') : tune?.lines?.length ? null : 'Add music notes to the score.';
    } catch (failure) {
      return failure instanceof Error ? failure.message : 'Could not parse this score.';
    }
  })();
  remember(scores, source, result);
  void result.catch(() => { if (scores.get(source) === result) scores.delete(source); });
  return result;
}

export interface EmbedError {
  index: number;
  type: 'equation' | 'music';
  message: string;
}

export async function noteEmbedErrors(content: string): Promise<EmbedError[]> {
  if (!content) return [];
  const state = JSON.parse(content);
  const nodes: Record<string, unknown>[] = [state.root];
  const pending: Promise<EmbedError | null>[] = [];
  let index = 0;
  while (nodes.length) {
    const node = nodes.pop();
    if (!node || typeof node !== 'object') continue;
    if (node.type === 'equation' || node.type === 'music') {
      const type = node.type;
      const position = index++;
      const source = type === 'equation' ? node.equation : node.abc;
      if (typeof source === 'string' && source.trim()) {
        const error = type === 'equation' ? equationError(source, node.inline === true) : musicError(source);
        pending.push(Promise.resolve(error).then(message => message ? { index: position, type, message } : null));
      }
    }
    if (Array.isArray(node.children)) nodes.push(...[...node.children].reverse());
  }
  return (await Promise.all(pending)).filter((error): error is EmbedError => error !== null);
}
