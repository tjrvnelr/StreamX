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

## Production upload configuration

The web app and API must use the same Firebase project. Set the Vercel build variable `VITE_FIREBASE_PROJECT_ID` and the Render API variable `FIREBASE_PROJECT_ID` to that project's ID (the current production browser reports `streamx-ad9da`). In Render, also set `FIREBASE_SERVICE_ACCOUNT_KEY` to the service account JSON from that Firebase project. Keep the JSON value private; do not commit it. The API accepts either the JSON value or a path to a JSON file.

For the current deployment, set Vercel's `VITE_API_URL` to `https://streamx-57z2.onrender.com/api` and Render's `FRONTEND_ORIGIN` to `https://stream-x-six-xi.vercel.app`. After changing Vercel variables, rebuild and redeploy the frontend; after changing Render variables, redeploy the API.

Cloudflare R2 must allow browser uploads from the Vercel site origin. With the API/R2 environment configured locally, run `npm run r2:cors:check` to inspect the bucket rules. If the frontend origin, `PUT` method, `Content-Type` request header, or exposed `ETag` response header is missing, run `npm run r2:cors:apply` to add the upload CORS rule.
