# Architecture

## Notes, trails and connections

Tramo is a Memex-inspired tool for writing connected, reusable notes.
Projects group notes and **trails**: ordered sequences of notes for learning,
explaining and sharing ideas.

A connection points from one note to another in the same project, with optional
shared text (up to 2,000 characters). Trail order is independent of connections.
Reordering or removing a note from a trail leaves its connections intact.

## Stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS 4, plain CSS, next-themes
- Lexical, KaTeX, abcjs
- Radix UI / shadcn, lucide-react, motion
- React Flow for graphs, driver.js for editor tutorials
- Google OAuth

## Layout

```text
app/
  (app)/ (auth)/   app and authentication routes
  api/            backend proxies
  editor/         editor, custom nodes and plugins
  p/              public projects
  projects/       sharing and publishing
components/       UI by domain
lib/              API clients, authentication and utilities
hooks/            React hooks
types/            shared types
tests/            Jest tests
```
