// Shared project-feed types and DTO mapping. Plain module (no "use server") so
// the sync mapper can be exported and reused across server-action files.

export interface ProjectFeedItem {
  id: string;
  title: string;
  description: string | null;
  ownerUsername: string;
  ownerAvatar: string | null;
  thumbnail: string | null;
  tags: string[];
  modifiedDate: string;
  voteCount: number;
  votedByRequester: boolean;
  bookmarkedByRequester: boolean;
  viewCount: number;
  forkCount: number;
  commentCount: number;
  featured: boolean;
}

export interface ProjectFeedItemDTO {
  id: number;
  title: string;
  description: string | null;
  ownerUsername: string;
  ownerAvatar: string | null;
  thumbnail: string | null;
  tags: string | null;
  modifiedDate: string;
  voteCount: number;
  votedByRequester: boolean;
  bookmarkedByRequester: boolean;
  viewCount: number;
  forkCount: number;
  commentCount: number;
  featured: boolean;
}

export function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags.split(",").map((tag) => tag.trim()).filter(Boolean);
}

export function toFeedItem(item: ProjectFeedItemDTO): ProjectFeedItem {
  return {
    id: String(item.id),
    title: item.title,
    description: item.description,
    ownerUsername: item.ownerUsername,
    ownerAvatar: item.ownerAvatar,
    thumbnail: item.thumbnail,
    tags: parseTags(item.tags),
    modifiedDate: item.modifiedDate,
    voteCount: item.voteCount,
    votedByRequester: item.votedByRequester,
    bookmarkedByRequester: item.bookmarkedByRequester,
    viewCount: item.viewCount,
    forkCount: item.forkCount,
    commentCount: item.commentCount,
    featured: item.featured,
  };
}
