# StreamX

StreamX is a self-hostable video library and streaming application for browsing, uploading, organizing, and watching personal media.

**Live:** [stream-x-six-xi.vercel.app](https://stream-x-six-xi.vercel.app/)
**StreamX Mobile App** https://github.com/tjrvnelr/StreamX/releases

## Features

- Browse, search, and discover videos
- Stream video with HLS.js
- Firebase Authentication and user profiles
- Public, unlisted, and private video visibility
- Watchlists and personal library workflows
- Video uploads with single-part and multipart upload support
- Thumbnail uploads and signed playback URLs
- Responsive React interface
- Cloudflare R2 object storage integration

## Technology stack

The current implementation is not a conventional MongoDB-based MERN application. It uses:

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **API:** Node.js, Express, TypeScript
- **Authentication and database:** Firebase Authentication and Cloud Firestore
- **Video storage:** Cloudflare R2 through the S3-compatible API
- **Playback:** HLS.js
- **Validation and security:** Zod, Helmet, CORS, and express-rate-limit
- **Testing:** Vitest, Testing Library, and Playwright

## Prerequisites

- Node.js with npm
- A Firebase project with Authentication and Firestore enabled
- A Cloudflare R2 bucket and API credentials
- A deployment or local host for the Express API

## Scope and limitations

StreamX currently focuses on private or self-hosted video libraries. The project does not provide:

- Native iOS or Android applications
- Live television broadcasting
- Original content production
- Payments or subscriptions
- Advanced DRM protection
- Offline downloads
- Multi-language subtitle editing
