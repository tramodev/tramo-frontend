export type Embed = { provider: 'youtube' | 'tweet'; id: string };

export function validateEmbed(provider: unknown, id: unknown): Embed | null {
  if (typeof id !== 'string') return null;
  if (provider === 'youtube' && /^[A-Za-z0-9_-]{11}$/.test(id)) return { provider, id };
  if (provider === 'tweet' && /^[1-9]\d{0,19}$/.test(id)) return { provider, id };
  return null;
}

export function parseEmbedUrl(value: string): Embed | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname)) {
      const id = url.pathname === '/watch'
        ? url.searchParams.get('v')
        : url.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
      return validateEmbed('youtube', id);
    }
    if (url.hostname === 'youtu.be') {
      return validateEmbed('youtube', url.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/)?.[1]);
    }
    if (['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com'].includes(url.hostname)) {
      return validateEmbed('tweet', url.pathname.match(/^\/(?:[A-Za-z0-9_]+\/status|i\/web\/status|i\/status)\/(\d+)(?:\/(?:photo|video)\/\d+)?\/?$/)?.[1]);
    }
    return null;
  } catch {
    return null;
  }
}
