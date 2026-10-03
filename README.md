# tramo-frontend

Frontend for **Tramo**, a tool for capturing ideas as an associative graph and then carving
ordered, shareable paths through them — a modern take on Vannevar Bush's Memex.

The backend lives in [`tramo-api`](../tramo-api) and serves the API on `http://localhost:8080`.

## Getting started

Requires Node 20+ and the API running locally.

Create `.env.local`:

| Variable | Purpose |
| --- | --- |
| `API_BASE_URL` | Base URL of the backend (defaults to `http://localhost:8080`) |
| `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` | Public base URL for images served from R2 |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID, must match the backend's |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | reCAPTCHA site key used on sign-up |
| `NEXT_PUBLIC_SITE_URL` | Public URL of this app, used for metadata and the sitemap |

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
npm run knip     # unused files, exports and dependencies
```

## Stack

- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript**
- **Tailwind v4** alongside plain CSS (`app/globals.css`, `app/editor/Editor.css`)
- **Lexical** for the editor, **KaTeX** for math rendering
- **radix-ui** / shadcn (new-york) primitives, **lucide-react** icons, **motion** for animation
- **@xyflow/react** for the knowledge graph, **driver.js** for the editor tour
- **@react-oauth/google** for Google sign-in

Styling follows a Material 3 feel with a largely monochromatic palette, driven by CSS variables
with light and dark themes (`next-themes`).

## Layout

```
app/
├── (app)/ (auth)/   route groups for the signed-in app and the auth pages
├── api/             route handlers that proxy to the backend
├── editor/          the editor
├── p/               public read-only view of a published project
└── projects/        project list, sharing and publishing
components/          UI by domain (editor, project, feed, layout, profile, ui, …)
lib/                 API clients, auth helpers, shared utilities
hooks/  types/
```

Auth tokens live in httpOnly cookies, so every call to the API goes through a server action or
a route handler under `app/api/`, which attaches the bearer token server-side.

The editor (`app/editor/`) is the largest part of the app. It is built on Lexical, with custom
nodes in `nodes/`, one file per feature in `plugins/`, and item content persisted as Lexical
editor-state JSON. Published projects reuse the same nodes in a read-only instance
(`components/project/lexical-read-only.tsx`).


## Note image privacy

Note images use the backend's private attachment upload flow and version-2 Lexical image nodes
containing `imageId`. Signed URLs stay in the shared rendering provider, expire after five
minutes, and are renewed while the view is visible. Saving and copying editor content do not
persist these URLs. Published and historical views resolve only images in their visible snapshot.

Set `NEXT_PUBLIC_R2_PRIVATE_ORIGIN=https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` before building
or starting the frontend. The backend must have a separate `R2_PRIVATE_BUCKET` with public access
disabled and browser CORS configured for this frontend's exact origin. See the backend README
for bucket lifecycle and credential configuration. Avatars, banners and separately uploaded
thumbnails still use the public bucket; do not put confidential information there.

Deploy backend and frontend together. There is no automatic migration of version-1 image URLs;
existing public objects remain public. Returning a project to private stops new signed links,
but links already issued can work until their five-minute expiry and downloaded copies remain.
