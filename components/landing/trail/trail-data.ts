// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only

export const PROJECT_ID = 'y1Og16';

export const NOTES = [
  {
    id: 'note-1',
    title: 'Write a note once.',
    body: 'Give it a title and say one thing clearly. A note about a single idea can be reused anywhere that idea fits.',
  },
  {
    id: 'note-2',
    title: 'Connect it with @mentions.',
    body: 'Type @ to link another note. Every mention becomes a connection, listed in the panel next to the note.',
  },
  {
    id: 'note-3',
    title: 'Reuse it in another trail.',
    body: 'Add the same note to a second trail without copying it. Edit it once and both trails show the change.',
  },
  {
    id: 'note-4',
    title: 'See how it all connects.',
    body: 'The map draws every note and connection in the project, so you can see exactly where two trails cross.',
  },
  {
    id: 'collaboration',
    title: 'Write it together.',
    body: 'Invite people by username and edit the same note in real time. Every cursor is labeled, so you know who is writing what.',
  },
  {
    id: 'note-6',
    title: 'Keep it private, or publish it.',
    body: 'Projects are private by default. When you publish, readers see a snapshot on Explore, and later edits stay private until you publish an update.',
  },
  {
    id: 'community',
    title: 'Let others build on it.',
    body: 'Published projects are listed on Explore, and anyone can read them without an account. Readers follow your trails note by note and can fork them to start their own, with your name kept on the original.',
  },
] as const;

export const TRAILS = [
  { id: 'product', title: 'How Tramo works', steps: NOTES.map(note => note.title) },
  { id: 'free-and-open', title: 'Free and open', steps: ['Open source', 'Plans'] },
] as const;

export const TRAIL_ONE = 'Bush’s vision';
export const TRAIL_TWO = 'Thinking in trails';

export const STAGE_URLS = [
  ...Array.from({ length: 6 }, () => `tramo.dev/editor/${PROJECT_ID}`),
  `tramo.dev/projects/${PROJECT_ID}/publish`,
  'tramo.dev/explore',
];

export type MiniProject = {
  title: string;
  description: string;
  owner: string;
  date: string;
  tags: string[];
  thumbnail?: string;
  forkedFrom?: { owner: string; title: string };
  stats?: { votes: number; views: number; comments: number };
};

export const YOUR_PROJECT: MiniProject = {
  title: 'Memex and Vannevar Bush',
  description: 'An exploration of the Memex, associative trails, and the ideas that shaped personal knowledge.',
  owner: 'ana',
  date: 'Nov 11',
  tags: ['history', 'knowledge'],
  thumbnail: '/memex-example.webp',
  stats: { votes: 24, views: 312, comments: 5 },
};

export const FORKED_PROJECT: MiniProject = {
  title: 'New trails through the Memex',
  description: 'A new perspective built on a shared starting point.',
  owner: 'nolan',
  date: 'Nov 12',
  tags: ['history'],
  forkedFrom: { owner: 'ana', title: YOUR_PROJECT.title },
  stats: { votes: 3, views: 41, comments: 1 },
};

export const NEIGHBORS: MiniProject[] = [
  {
    title: 'Mapping the origins of jazz',
    description: 'A short trail through the roots of jazz, from New Orleans brass bands to bebop.',
    owner: 'nolan',
    date: 'Nov 9',
    tags: ['music', 'history'],
    stats: { votes: 12, views: 186, comments: 2 },
  },
  {
    title: 'A field guide to houseplants',
    description: 'Light, water, and soil notes for the plants that actually survive my apartment.',
    owner: 'sage',
    date: 'Nov 8',
    tags: ['plants', 'guide'],
  },
];
