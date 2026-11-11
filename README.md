# StreamX

StreamX is a self-hostable video library and streaming application for browsing, uploading, organizing, and watching personal media.

- **Live:** [stream-x-six-xi.vercel.app](https://stream-x-six-xi.vercel.app/)
- **StreamX Mobile App:** https://github.com/tjrvnelr/StreamX/releases

## Features

- **Browse & Search:** Discover videos in your personal library.
- **HLS Streaming:** Smooth video playback using HLS.js.
- **Authentication:** Secure user profiles and sign-in via Firebase.
- **Visibility Control:** Public, unlisted, and private video settings.
- **Library Management:** Watchlists and personal video organization.
- **Uploads:** Support for single-part and large multipart video uploads.
- **Thumbnails:** Automated or manual thumbnail management.
- **Mobile Integration:** Dedicated Flutter Android app for catalog browsing and playback.
- **R2 Storage:** Cloudflare R2 integration for cost-effective object storage.

## Project Structure

```text
StreamX/
├── web-app/          # React + Vite frontend
├── native-app/       # Flutter mobile application
├── server/           # Node.js + Express API
├── scripts/          # Utility scripts (e.g., R2 CORS configuration)
├── tests/            # E2E tests (Playwright)
└── firestore.rules   # Security rules for Firestore
```

## Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Radix UI.
- **Mobile:** Flutter, Dart, Firebase Core, Video Player.
- **Backend:** Node.js, Express 5, TypeScript, Zod.
- **Infrastructure:**
    - **Database:** Cloud Firestore.
    - **Auth:** Firebase Authentication.
    - **Storage:** Cloudflare R2 (S3-compatible).
- **Playback:** HLS.js.
- **Validation:** Zod.
- **Security:** Helmet, CORS, Express Rate Limit.
- **Testing:** Vitest (Unit/Integration), Playwright (E2E).

## Scope and Limitations

StreamX currently focuses on private or self-hosted video libraries. The project does not provide:

- Native iOS applications (planned).
- Native sign-in in the Android app (catalog browsing only).
- Live television broadcasting.
- Advanced DRM protection.
- Offline downloads.
