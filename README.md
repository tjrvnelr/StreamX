# StreamX

A responsive video streaming app built with React, Vite, TypeScript, Tailwind CSS, shadcn-style accessible primitives, Supabase, and Cloudflare R2. The interface uses a dark neumorphic surface system with an optional light theme.

## Included

- Dynamic Supabase catalog search across title, description, creator, category, and tags.
- Home, explore, categories, trending, video detail/player, library, upload, creator dashboard, and account settings routes.
- Email/password sign-in, sign-up verification, password reset, profiles, watch history/progress, Watch later, likes, and playlists.
- HTML5 playback with keyboard controls, playback speed, picture-in-picture, fullscreen, captions, retry, resume progress, and an hls.js playback path for future authorized manifests.
- Private R2 direct uploads with signed single PUTs, multipart uploads, progress, thumbnail upload, server-side size/type checks, and owner-bound cleanup.
- PostgreSQL migration with indexes, constraints, profile creation, search and creator-metric RPCs, and RLS policies.
- Clearly labeled local preview content when Supabase environment values are missing. Preview metrics never appear in configured production mode.

## Run locally

1. Copy `.env.example` to `.env` and fill in the Supabase and R2 values.
2. Apply `supabase/migrations/202610270001_streamx_schema.sql` and `supabase/seed.sql`.
3. Run `npm install` and `npm run dev:all`.

See [deployment setup](docs/deployment.md) for R2 CORS, secret handling, frontend/API deployment, and infrastructure limits. Architecture and phase boundaries are in [docs/architecture.md](docs/architecture.md).

## Build and test

```sh
npm run build
npm run build:server
npm test
npx playwright install chromium
npm run test:e2e
```

The backend is a separate Node service. Browser credentials use only the Supabase anon key; Supabase service-role and R2 keys must stay on the server. HLS transcoding, private HLS delivery, OAuth, notifications, and asynchronous high-volume deletion require additional infrastructure.
