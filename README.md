# tramo-frontend

Frontend for **Tramo**, a Memex-inspired tool for writing connected, reusable notes.
Projects group notes and **trails**: ordered sequences of notes for learning,
explaining and sharing ideas.

The backend is [`tramo-api`](../tramo-api), running at `http://localhost:8080`.

## Environment

Create `.env.local`:

```dotenv
API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
NEXT_PUBLIC_R2_PUBLIC_BASE_URL=https://your-public-bucket.example.com
NEXT_PUBLIC_R2_PRIVATE_ORIGIN=https://your-account-id.r2.cloudflarestorage.com
```

Use the Google OAuth client and reCAPTCHA configuration for your environment.
The public R2 URL serves avatars, banners and thumbnails; the private R2 origin
serves signed note images. Both buckets are configured in the backend.

## Running

Requires Node.js 20+ and the backend running.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. For a production build:

```bash
npm run build
npm start
```

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

## Tests

Jest tests cover session access, token refresh, autosave, trail navigation,
associations and text statistics.

```bash
npm test
```

Additional checks:

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run knip
```

Check editor changes in the browser for focus, selection and keyboard behavior.
