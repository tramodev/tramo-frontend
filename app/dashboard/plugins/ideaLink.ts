// Idea-reference links are plain LinkNodes carrying the referenced idea id in
// `rel` (not `href` — LinkNode.sanitizeUrl() rewrites any href scheme outside
// http/https/mailto/sms/tel to "about:blank", so a custom scheme never
// survives to the rendered DOM). IdeaLinkClickPlugin intercepts clicks on
// this rel marker (before ClickableLinkPlugin can act on the href) and
// routes to the referenced idea within the app instead.
export const IDEA_LINK_REL_PREFIX = 'mypath-idea:';

export function ideaLinkRel(ideaId: string): string {
  return `${IDEA_LINK_REL_PREFIX}${ideaId}`;
}

export function ideaIdFromRel(rel: string): string | null {
  return rel.startsWith(IDEA_LINK_REL_PREFIX) ? rel.slice(IDEA_LINK_REL_PREFIX.length) : null;
}
