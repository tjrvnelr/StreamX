# StreamX

StreamX is a video discovery and creator app. Browse, search, and watch videos; signed-in users can save videos, keep watch history, create playlists, upload videos, and manage their creator profile and uploads.

## Features

- Home feed with featured, popular, recent, categorized, and continue-watching sections.
- Search and discovery by title, description, creator, category, and tag, with relevance, newest, and popular sorting.
- Video playback with resume progress, playback controls, and support for direct video files and HLS streams.
- Signed-in library for watch history, Watch later, liked videos, and playlists.
- Creator uploads to Cloudflare R2, with upload progress, retry support, thumbnails, and public, unlisted, or private visibility.
- Creator dashboard for upload status and view metrics, plus profile, password-reset, and theme settings.
- Preview catalog when Supabase is not configured. Preview content is illustrative; account, library, and creator features require the backend services.

## Tech stack

- React 19, TypeScript, Vite, Tailwind CSS, and React Router
- Supabase Auth and Postgres, including row-level security
- Express API with Cloudflare R2 object storage and presigned upload/playback URLs
- Vitest and Testing Library for unit tests; Playwright for end-to-end tests
