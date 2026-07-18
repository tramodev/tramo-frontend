export const IDEA_LINK_REL_PREFIX = 'tramo-idea:';
const LEGACY_IDEA_LINK_REL_PREFIX = 'mypath-idea:';

export function ideaLinkRel(ideaId: string): string {
  return `${IDEA_LINK_REL_PREFIX}${ideaId}`;
}

export function ideaIdFromRel(rel: string): string | null {
  if (rel.startsWith(IDEA_LINK_REL_PREFIX)) return rel.slice(IDEA_LINK_REL_PREFIX.length);
  if (rel.startsWith(LEGACY_IDEA_LINK_REL_PREFIX)) return rel.slice(LEGACY_IDEA_LINK_REL_PREFIX.length);
  return null;
}
