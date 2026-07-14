export const IDEA_LINK_REL_PREFIX = 'mypath-idea:';

export function ideaLinkRel(ideaId: string): string {
  return `${IDEA_LINK_REL_PREFIX}${ideaId}`;
}

export function ideaIdFromRel(rel: string): string | null {
  return rel.startsWith(IDEA_LINK_REL_PREFIX) ? rel.slice(IDEA_LINK_REL_PREFIX.length) : null;
}
