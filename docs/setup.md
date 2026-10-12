# Setup

## Requirements

Node.js 20+.

## Environment

Create `.env.local` in the repository root:

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

## Development

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Production

```bash
npm run build
npm start
```
