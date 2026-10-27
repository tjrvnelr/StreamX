import { lazy, Suspense } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from './components/layout/app-shell'
import { Button } from './components/ui/button'

const HomePage = lazy(() => import('./pages/home-page').then((module) => ({ default: module.HomePage })))
const DiscoveryPage = lazy(() => import('./pages/discovery-page').then((module) => ({ default: module.DiscoveryPage })))
const WatchPage = lazy(() => import('./pages/watch-page').then((module) => ({ default: module.WatchPage })))
const LibraryPage = lazy(() => import('./pages/library-page').then((module) => ({ default: module.LibraryPage })))
const UploadPage = lazy(() => import('./pages/upload-page').then((module) => ({ default: module.UploadPage })))
const DashboardPage = lazy(() => import('./pages/dashboard-page').then((module) => ({ default: module.DashboardPage })))
const SettingsPage = lazy(() => import('./pages/settings-page').then((module) => ({ default: module.SettingsPage })))

function NotFoundPage() {
  return <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center text-center"><span className="text-6xl font-extrabold tracking-[-0.08em] text-violet">404</span><h1 className="mt-4 text-2xl font-bold text-ink">This page went off air</h1><p className="mt-2 text-sm leading-6 text-muted">The link may have changed, or the page may no longer be available.</p><Link to="/"><Button variant="raised" className="mt-6"><ArrowLeft className="size-4" />Back to StreamX</Button></Link></div>
}

function PageFallback() {
  return <div role="status" className="flex min-h-[55vh] items-center justify-center text-sm text-muted">Loading StreamX…</div>
}

export default function App() {
  return <Routes>
    <Route element={<AppShell />}>
      <Route index element={<Suspense fallback={<PageFallback />}><HomePage /></Suspense>} />
      <Route path="explore" element={<Suspense fallback={<PageFallback />}><DiscoveryPage mode="explore" /></Suspense>} />
      <Route path="categories" element={<Suspense fallback={<PageFallback />}><DiscoveryPage mode="explore" /></Suspense>} />
      <Route path="search" element={<Suspense fallback={<PageFallback />}><DiscoveryPage mode="search" /></Suspense>} />
      <Route path="trending" element={<Suspense fallback={<PageFallback />}><DiscoveryPage mode="trending" /></Suspense>} />
      <Route path="watch/:id" element={<Suspense fallback={<PageFallback />}><WatchPage /></Suspense>} />
      <Route path="library" element={<Suspense fallback={<PageFallback />}><LibraryPage /></Suspense>} />
      <Route path="upload" element={<Suspense fallback={<PageFallback />}><UploadPage /></Suspense>} />
      <Route path="dashboard" element={<Suspense fallback={<PageFallback />}><DashboardPage /></Suspense>} />
      <Route path="settings" element={<Suspense fallback={<PageFallback />}><SettingsPage /></Suspense>} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
}
