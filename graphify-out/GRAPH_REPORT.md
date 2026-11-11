# Graph Report - StreamX  (2026-11-12)

## Corpus Check
- 102 files · ~41,044 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 23 file(s) not represented in the graph (top: .xml 7, (none) 6, .properties 2)

## Summary
- 990 nodes · 1843 edges · 55 communities (38 shown, 17 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f250fead`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- videos.ts
- index.js
- streamx_state.dart
- index.ts
- watch_screen.dart
- package.json
- react
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
- win32_window.cpp
- account_screen.dart
- streamx_components.dart
- eslint.config.js
- preview_catalog.dart
- @vitejs/plugin-react
- vercel.json
- firebase_options.dart
- FlutterWindow
- video_card.dart
- StreamX
- package:flutter/material.dart
- FlutterActivity
- .Create
- express.d.ts
- tsconfig.json
- AGENTS.md
- utils.cpp
- streamx_api.dart
- Win32Window
- package.json
- r2-cors.mjs
- .OnCreate
- analysis_options.yaml
- Point
- StreamX Mobile
- @playwright/test

## God Nodes (most connected - your core abstractions)
1. `Button` - 34 edges
2. `react` - 27 edges
3. `WatchPage()` - 26 edges
4. `UploadPage()` - 24 edges
5. `IconButton()` - 23 edges
6. `LibraryPage()` - 23 edges
7. `DashboardPage()` - 22 edges
8. `Win32Window` - 21 edges
9. `lucide-react` - 21 edges
10. `VideoCard()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `wWinMain()` --calls--> `CreateAndAttachConsole()`  [INFERRED]
  native-app/windows/runner/main.cpp → native-app/windows/runner/utils.cpp
- `FlutterWindow` --inherits--> `Win32Window`  [EXTRACTED]
  native-app/windows/runner/flutter_window.h → native-app/windows/runner/win32_window.h
- `DashboardPage()` --calls--> `Badge()`  [EXTRACTED]
  web-app/src/pages/dashboard-page.tsx → web-app/src/components/ui/badge.tsx
- `HomePage()` --calls--> `Badge()`  [EXTRACTED]
  web-app/src/pages/home-page.tsx → web-app/src/components/ui/badge.tsx
- `UploadPage()` --calls--> `Badge()`  [EXTRACTED]
  web-app/src/pages/upload-page.tsx → web-app/src/components/ui/badge.tsx

## Import Cycles
- None detected.

## Communities (55 total, 17 thin omitted)

### Community 0 - "videos.ts"
Cohesion: 0.05
Nodes (98): lucide-react, react-router-dom, vitest, SearchBox(), Button, buttonStyles, EmptyState(), ErrorState() (+90 more)

### Community 1 - "index.js"
Cohesion: 0.07
Nodes (35): zod@^4.0.0, zod, allowedOrigins, env, parsed, r2Endpoint, schema, admin (+27 more)

### Community 2 - "streamx_state.dart"
Cohesion: 0.03
Nodes (59): addToPlaylist, _allCategory, catalogError, catalogLoading, _catalogVideos, _categories, _categoriesFromVideos, createPlaylist (+51 more)

### Community 3 - "index.ts"
Cohesion: 0.06
Nodes (39): allowedOrigins, env, parsed, r2Endpoint, schema, { adminAuth, adminDb }, app, authenticate() (+31 more)

### Community 4 - "watch_screen.dart"
Cohesion: 0.06
Nodes (29): brand, build, _controller, _copyVideoTitle, createState, _descriptionExpanded, dispose, _error (+21 more)

### Community 5 - "package.json"
Cohesion: 0.07
Nodes (29): dependencies, @aws-sdk/s3-request-presigner@^3.1000.0, class-variance-authority@^0.7.1, clsx@^2.1.1, cors@^2.8.5, express@^5.1.0, express-rate-limit@^8.0.0, firebase@^13.2.0 (+21 more)

### Community 6 - "react"
Cohesion: 0.07
Nodes (49): firebase, react, App(), DashboardPage, DiscoveryPage, HomePage, LibraryPage, NotFoundPage() (+41 more)

### Community 7 - "UploadPage"
Cohesion: 0.10
Nodes (31): apiBase, ApiError, apiRequest(), getAccessToken(), jsonBody(), normalizeApiBase(), resolveApiBase(), currentUser (+23 more)

### Community 8 - "streamx_theme.dart"
Cohesion: 0.07
Nodes (27): brand, canvas, darkCanvas, darkDim, darkInk, darkLifted, darkLine, darkMuted (+19 more)

### Community 9 - "devDependencies"
Cohesion: 0.09
Nodes (22): devDependencies, autoprefixer@^10.4.21, concurrently@^9.1.2, postcss@^8.5.3, tailwindcss@^3.4.17, @testing-library/jest-dom@^7.0.1, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8 (+14 more)

### Community 10 - "streamx_video.dart"
Cohesion: 0.07
Nodes (26): category, copyWith, createdAt, creator, days, description, durationSeconds, formatAge (+18 more)

### Community 11 - "library_screen.dart"
Cohesion: 0.10
Nodes (16): build, _createPlaylist, icon, label, LibraryScreen, _LibraryTabChip, _PlaylistContent, _showCreatePlaylist (+8 more)

### Community 12 - "home_screen.dart"
Cohesion: 0.10
Nodes (19): StreamXShell, _StreamXWordmark, StreamXVideo, AccountScreen, build, _categoryName, _FeaturedHero, _HeroBadge (+11 more)

### Community 13 - "app.dart"
Cohesion: 0.10
Nodes (15): build, createState, dispose, onToggleTheme, _searchFocusNode, state, StreamXApp, _StreamXAppState (+7 more)

### Community 14 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 15 - "pubspec.yaml"
Cohesion: 0.10
Nodes (19): dependencies, cloud_firestore, cupertino_icons, firebase_core, flutter, video_player, description, dev_dependencies (+11 more)

### Community 16 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 17 - "explore_screen.dart"
Cohesion: 0.14
Nodes (10): build, createState, dispose, initState, label, _searchController, searchFocusNode, _SortChip (+2 more)

### Community 18 - "VideoPlayer"
Cohesion: 0.14
Nodes (6): hls.js@^1.6.0, hls.js, getQualityLevels(), QualityLevel, VideoPlayer(), VideoPlayerProps

### Community 19 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, build, build:server, dev, dev:all, dev:frontend, dev:server, lint (+8 more)

### Community 20 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, lib, module, moduleResolution, noFallthroughCasesInSwitch, noUnusedLocals, noUnusedParameters, outDir (+7 more)

### Community 22 - "account_screen.dart"
Cohesion: 0.14
Nodes (10): build, icon, onTap, onToggleTheme, _SettingsTile, state, subtitle, themeMode (+2 more)

### Community 23 - "streamx_components.dart"
Cohesion: 0.14
Nodes (11): actionLabel, build, CategoryChips, description, eyebrow, icon, onAction, openVideo (+3 more)

### Community 24 - "eslint.config.js"
Cohesion: 0.15
Nodes (12): eslint@^10.13.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.7, globals@^17.13.0, typescript-eslint@^8.72.0, eslint, @eslint/js (+4 more)

### Community 25 - "preview_catalog.dart"
Cohesion: 0.15
Nodes (10): _design, _documentary, _nature, _now, previewCategories, previewFeatured, previewVideos, _samplePlayback (+2 more)

### Community 26 - "@vitejs/plugin-react"
Cohesion: 0.29
Nodes (4): vite@^8.3.5, @vitejs/plugin-react@^6.1.2, vite, @vitejs/plugin-react

### Community 28 - "firebase_options.dart"
Cohesion: 0.17
Nodes (5): android, DefaultFirebaseOptions, ios, initializeApp, main

### Community 29 - "FlutterWindow"
Cohesion: 0.12
Nodes (4): FlutterWindow, flutter_controller_, FlutterWindow::FlutterWindow(), project_

### Community 30 - "video_card.dart"
Cohesion: 0.12
Nodes (15): build, _buildCompact, _buildHorizontal, _buildVertical, compact, _details, horizontal, imageUrl (+7 more)

### Community 32 - "StreamX"
Cohesion: 0.33
Nodes (5): Features, Project Structure, Scope and Limitations, StreamX, Technology Stack

### Community 35 - ".Create"
Cohesion: 0.16
Nodes (7): Scale(), Win32Window::Win32Window(), WindowClassRegistrar, class_registered_, WindowClassRegistrar::GetWindowClass(), instance_, WindowClassRegistrar::UnregisterWindowClass()

### Community 40 - "utils.cpp"
Cohesion: 0.19
Nodes (4): wWinMain(), CreateAndAttachConsole(), GetCommandLineArguments(), Utf8FromUtf16()

### Community 41 - "streamx_api.dart"
Cohesion: 0.18
Nodes (7): _apiBase, base, endsWith, playbackUrl, _request, StreamXApi, thumbnailUrls

### Community 44 - "Win32Window"
Cohesion: 0.18
Nodes (7): Size, height, width, Win32Window, child_content_, quit_on_close_, window_handle_

### Community 45 - "package.json"
Cohesion: 0.12
Nodes (16): allowScripts, esbuild@0.28.2, jsdom@^29.1.1, tsx@^4.19.3, @types/cors@^2.8.17, @types/express@^5.0.3, @types/react-dom@^19.3.0, name (+8 more)

### Community 46 - "r2-cors.mjs"
Cohesion: 0.18
Nodes (10): @aws-sdk/client-s3@^3.1000.0, dotenv@^18.0.9, @aws-sdk/client-s3, dotenv, client, missing, origins, required (+2 more)

### Community 48 - "analysis_options.yaml"
Cohesion: 0.33
Nodes (5): analyzer, exclude, include, linter, rules

### Community 49 - "Point"
Cohesion: 0.50
Nodes (3): Point, x, y

## Knowledge Gaps
- **241 isolated node(s):** `category`, `copyWith`, `createdAt`, `creator`, `days` (+236 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 513 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `videos.ts`, `package.json`, `UploadPage`, `package.json`, `VideoPlayer`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `category`, `copyWith`, `createdAt` to the rest of the system?**
  _241 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `videos.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0546831955922865 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `videos.ts` to `package.json`, `react`, `UploadPage`, `package.json`, `VideoPlayer`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06765327695560254 - nodes in this community are weakly interconnected._
- **Why does `Win32Window` connect `Win32Window` to `.Create`, `flutter_window.h`, `.OnCreate`, `Point`, `win32_window.cpp`, `FlutterWindow`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Should `streamx_state.dart` be split into smaller, more focused modules?**
  _Cohesion score 0.03125 - nodes in this community are weakly interconnected._