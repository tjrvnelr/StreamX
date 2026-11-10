# Graph Report - StreamX  (2026-11-10)

## Corpus Check
- 90 files · ~36,801 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: .xml 7, (none) 5, .properties 2)

## Summary
- 854 nodes · 1640 edges · 53 communities (35 shown, 18 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f6ea1b4e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- upload-page.tsx
- index.js
- streamx_state.dart
- index.ts
- watch_screen.dart
- package.json
- videos.ts
- UploadPage
- streamx_theme.dart
- devDependencies
- streamx_video.dart
- library_screen.dart
- home_screen.dart
- app.dart
- compilerOptions
- pubspec.yaml
- compilerOptions
- explore_screen.dart
- VideoPlayer
- scripts
- compilerOptions
- video_card.dart
- account_screen.dart
- streamx_components.dart
- eslint.config.js
- preview_catalog.dart
- vitest
- main.tsx
- main.dart
- analysis_options.yaml
- firebase_options.dart
- @vitejs/plugin-react
- StreamX
- package:flutter/material.dart
- MainActivity.kt
- StreamX Mobile
- express.d.ts
- tsconfig.json
- AGENTS.md
- config.js
- package.json
- r2-cors.mjs
- home.spec.ts
- @playwright/test
- concurrently@^9.1.2
- jsdom@^29.1.1
- postcss@^8.5.3
- @types/cors@^2.8.17

## God Nodes (most connected - your core abstractions)
1. `Button` - 34 edges
2. `react` - 27 edges
3. `WatchPage()` - 26 edges
4. `IconButton()` - 23 edges
5. `LibraryPage()` - 23 edges
6. `DashboardPage()` - 22 edges
7. `UploadPage()` - 22 edges
8. `lucide-react` - 21 edges
9. `VideoCard()` - 19 edges
10. `compilerOptions` - 18 edges

## Surprising Connections (you probably didn't know these)
- `UploadPage()` --calls--> `useAuth()`  [EXTRACTED]
  web-app/src/pages/upload-page.tsx → web-app/src/components/auth/auth-context.ts
- `AppShell()` --calls--> `SearchBox()`  [EXTRACTED]
  web-app/src/components/layout/app-shell.tsx → web-app/src/components/search/search-box.tsx
- `VideoPlayer()` --calls--> `Button`  [EXTRACTED]
  web-app/src/components/player/video-player.tsx → web-app/src/components/ui/button.tsx
- `WatchPage()` --calls--> `VideoPlayer()`  [EXTRACTED]
  web-app/src/pages/watch-page.tsx → web-app/src/components/player/video-player.tsx
- `SearchBox()` --calls--> `VideoArtwork()`  [EXTRACTED]
  web-app/src/components/search/search-box.tsx → web-app/src/components/video/video-artwork.tsx

## Import Cycles
- None detected.

## Communities (53 total, 18 thin omitted)

### Community 0 - "upload-page.tsx"
Cohesion: 0.06
Nodes (100): firebase, lucide-react, @radix-ui/react-dialog, react, react-router-dom, App(), DashboardPage, DiscoveryPage (+92 more)

### Community 1 - "index.js"
Cohesion: 0.08
Nodes (28): admin, app, authenticate(), completeSchema, errorResponse(), generalLimiter, optionalAuth(), partUrlsSchema (+20 more)

### Community 2 - "streamx_state.dart"
Cohesion: 0.04
Nodes (44): addToPlaylist, createPlaylist, currentTab, deletePlaylist, _historyIds, historyVideos, homeVideos, id (+36 more)

### Community 3 - "index.ts"
Cohesion: 0.08
Nodes (31): { adminAuth, adminDb }, app, authenticate(), completeSchema, distPath, errorResponse(), generalLimiter, idSchema (+23 more)

### Community 4 - "watch_screen.dart"
Cohesion: 0.06
Nodes (29): brand, build, _controller, _copyVideoTitle, createState, _descriptionExpanded, dispose, _error (+21 more)

### Community 5 - "package.json"
Cohesion: 0.08
Nodes (26): dependencies, @aws-sdk/s3-request-presigner@^3.1000.0, class-variance-authority@^0.7.1, clsx@^2.1.1, cors@^2.8.5, express@^5.1.0, express-rate-limit@^8.0.0, firebase@^13.2.0 (+18 more)

### Community 6 - "videos.ts"
Cohesion: 0.07
Nodes (41): SearchBox(), saveForLater(), ageMs(), design, documentary, images, nature, previewCategories (+33 more)

### Community 7 - "UploadPage"
Cohesion: 0.11
Nodes (28): apiBase, ApiError, apiRequest(), getAccessToken(), jsonBody(), normalizeApiBase(), resolveApiBase(), currentUser (+20 more)

### Community 8 - "streamx_theme.dart"
Cohesion: 0.07
Nodes (27): brand, canvas, darkCanvas, darkDim, darkInk, darkLifted, darkLine, darkMuted (+19 more)

### Community 9 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, autoprefixer@^10.4.21, tsx@^4.19.3, @types/express@^5.0.3, @types/react@^19.3.0, @types/react-dom@^19.3.0, typescript@^5.9.3, autoprefixer (+5 more)

### Community 10 - "streamx_video.dart"
Cohesion: 0.08
Nodes (24): category, createdAt, creator, days, description, durationSeconds, formatAge, formatDuration (+16 more)

### Community 11 - "library_screen.dart"
Cohesion: 0.10
Nodes (16): build, _createPlaylist, icon, label, LibraryScreen, _LibraryTabChip, _PlaylistContent, _showCreatePlaylist (+8 more)

### Community 12 - "home_screen.dart"
Cohesion: 0.10
Nodes (18): StreamXShell, _StreamXWordmark, build, _categoryName, _FeaturedHero, _HeroBadge, HomeScreen, _HorizontalVideoList (+10 more)

### Community 13 - "app.dart"
Cohesion: 0.10
Nodes (13): build, createState, dispose, onToggleTheme, _searchFocusNode, state, StreamXApp, _StreamXAppState (+5 more)

### Community 14 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 15 - "pubspec.yaml"
Cohesion: 0.11
Nodes (18): dependencies, cupertino_icons, firebase_core, flutter, video_player, description, dev_dependencies, flutter_lints (+10 more)

### Community 16 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 17 - "explore_screen.dart"
Cohesion: 0.13
Nodes (12): build, createState, dispose, ExploreScreen, _ExploreScreenState, initState, label, _searchController (+4 more)

### Community 18 - "VideoPlayer"
Cohesion: 0.14
Nodes (6): hls.js@^1.6.0, hls.js, getQualityLevels(), QualityLevel, VideoPlayer(), VideoPlayerProps

### Community 19 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, build, build:server, dev, dev:all, dev:frontend, dev:server, lint (+8 more)

### Community 20 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, lib, module, moduleResolution, noFallthroughCasesInSwitch, noUnusedLocals, noUnusedParameters, outDir (+7 more)

### Community 21 - "video_card.dart"
Cohesion: 0.13
Nodes (14): StreamXVideo, build, _buildCompact, _buildHorizontal, _buildVertical, compact, _details, horizontal (+6 more)

### Community 22 - "account_screen.dart"
Cohesion: 0.13
Nodes (11): AccountScreen, build, icon, onTap, onToggleTheme, _SettingsTile, state, subtitle (+3 more)

### Community 23 - "streamx_components.dart"
Cohesion: 0.13
Nodes (12): actionLabel, build, CategoryChips, description, EmptyStatePanel, eyebrow, icon, onAction (+4 more)

### Community 24 - "eslint.config.js"
Cohesion: 0.15
Nodes (12): eslint@^10.13.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.7, globals@^17.13.0, typescript-eslint@^8.72.0, eslint, @eslint/js (+4 more)

### Community 25 - "preview_catalog.dart"
Cohesion: 0.15
Nodes (10): _design, _documentary, _nature, _now, previewCategories, previewFeatured, previewVideos, _samplePlayback (+2 more)

### Community 26 - "vitest"
Cohesion: 0.29
Nodes (6): @testing-library/jest-dom@^7.0.1, @testing-library/react@^16.3.3, vitest@^4.1.12, @testing-library/jest-dom, @testing-library/react, vitest

### Community 27 - "main.tsx"
Cohesion: 0.15
Nodes (11): react-dom@^19.3.1, react-dom, AuthProvider(), Theme, ThemeContext, ThemeContextValue, ThemeProvider(), ToastContext (+3 more)

### Community 29 - "analysis_options.yaml"
Cohesion: 0.33
Nodes (5): analyzer, exclude, include, linter, rules

### Community 30 - "firebase_options.dart"
Cohesion: 0.33
Nodes (3): android, DefaultFirebaseOptions, ios

### Community 31 - "@vitejs/plugin-react"
Cohesion: 0.29
Nodes (4): vite@^8.3.5, @vitejs/plugin-react@^6.1.2, vite, @vitejs/plugin-react

### Community 32 - "StreamX"
Cohesion: 0.33
Nodes (5): Features, Prerequisites, Scope and limitations, StreamX, Technology stack

### Community 44 - "config.js"
Cohesion: 0.13
Nodes (14): dotenv@^18.0.9, zod@^4.0.0, dotenv, zod, allowedOrigins, env, parsed, r2Endpoint (+6 more)

### Community 45 - "package.json"
Cohesion: 0.15
Nodes (12): allowScripts, esbuild@0.28.2, tailwindcss@^3.4.17, @testing-library/user-event@^14.6.8, @types/node@^24.19.2, name, private, type (+4 more)

### Community 46 - "r2-cors.mjs"
Cohesion: 0.22
Nodes (8): @aws-sdk/client-s3@^3.1000.0, @aws-sdk/client-s3, client, missing, origins, required, unique(), withUploadCors()

## Knowledge Gaps
- **206 isolated node(s):** `category`, `createdAt`, `creator`, `days`, `description` (+201 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 439 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `upload-page.tsx` to `main.tsx`, `package.json`, `VideoPlayer`, `package.json`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `category`, `createdAt`, `creator` to the rest of the system?**
  _206 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `upload-page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05661881977671451 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `upload-page.tsx` to `main.tsx`, `package.json`, `VideoPlayer`, `package.json`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07936507936507936 - nodes in this community are weakly interconnected._
- **Why does `react-router-dom` connect `upload-page.tsx` to `package.json`, `main.tsx`, `package.json`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Should `streamx_state.dart` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._