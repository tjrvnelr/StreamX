import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowDownWideNarrow, Search, Sparkles, TrendingUp } from 'lucide-react'
import { VideoCard } from '../components/video/video-card'
import { EmptyState, ErrorState, VideoGridSkeleton } from '../components/ui/content-state'
import { Button } from '../components/ui/button'
import { fetchCatalog, fetchCategories } from '../services/videos'
import { isSupabaseConfigured } from '../lib/supabase'
import type { Category, Video, VideoSort } from '../types/video'

type Mode = 'explore' | 'search' | 'trending'

export function DiscoveryPage({ mode }: { mode: Mode }) {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''
  const category = params.get('category') || 'all'
  const sort = (params.get('sort') as VideoSort | null) || (mode === 'trending' ? 'popular' : mode === 'explore' ? 'newest' : 'relevance')
  const [videos, setVideos] = useState<Video[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [preview, setPreview] = useState(!isSupabaseConfigured)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const [retryKey, setRetryKey] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError('')
      Promise.all([
        fetchCatalog({ query, category, sort, page, pageSize: 20 }),
        fetchCategories(),
      ]).then(([result, categoryResult]) => {
        if (!current) return
        setVideos((existing) => page === 0 ? result.videos : [...existing, ...result.videos])
        setHasMore(result.hasMore)
        setCategories(categoryResult.categories)
        setPreview(result.preview)
      }).catch((cause: unknown) => {
        if (current) setError(cause instanceof Error ? cause.message : 'Search could not be completed.')
      }).finally(() => { if (current) setLoading(false) })
    }, 0)
    return () => { current = false; window.clearTimeout(timer) }
  }, [query, category, sort, page, retryKey])

  const title = mode === 'trending' ? 'Trending now' : mode === 'search' ? 'Search results' : 'Explore videos'
  const subtitle = mode === 'trending' ? 'The videos people are spending time with.' : mode === 'search' ? (query ? `Showing matches for “${query}”` : 'Find something worth your time.') : 'Find a story, a place, or a point of view that stays with you.'
  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value === 'all' || !value) next.delete(key)
    else next.set(key, value)
    setParams(next)
  }

  return <div className="animate-fade-up space-y-7">
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div><p className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand">{mode === 'trending' ? <TrendingUp className="size-3.5" /> : <Sparkles className="size-3.5" />}{mode === 'trending' ? 'Popular on StreamX' : 'Find your next watch'}</p><h1 className="text-3xl font-extrabold tracking-[-0.06em] text-ink sm:text-[38px]">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{subtitle}</p></div>
      <label className="flex min-w-44 items-center gap-2.5 rounded-2xl border border-line/70 bg-surface px-3.5 shadow-inset-sm" htmlFor="sort-videos"><ArrowDownWideNarrow className="size-4 shrink-0 text-dim" /><span className="sr-only">Sort videos</span><select id="sort-videos" value={sort} onChange={(event) => setFilter('sort', event.target.value)} className="h-11 min-w-0 flex-1 appearance-none bg-transparent text-xs font-semibold text-ink outline-none"><option value="relevance">Relevance</option><option value="newest">Newest</option><option value="popular">Most viewed</option></select></label>
    </header>

    {preview && <div role="status" className="flex items-center gap-2 rounded-xl border border-brand/20 bg-brand/[0.06] px-3.5 py-2.5 text-[11px] text-muted"><Sparkles className="size-3.5 text-brand" /><span><strong className="text-ink">Preview data.</strong> Catalog counts are illustrative until Supabase is configured.</span></div>}

    {mode === 'search' && query && <div className="flex items-center gap-2.5 rounded-2xl bg-raised/70 px-4 py-3 text-xs text-muted"><Search className="size-4 text-brand" /><span>Searching titles, descriptions, creators, categories, and tags</span></div>}

    {categories.length > 1 && <div aria-label="Filter by category" className="scrollbar-hidden -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">{categories.map((item) => <button key={item.slug} type="button" aria-pressed={category === item.slug} onClick={() => setFilter('category', item.slug)} className={`whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-semibold transition ${category === item.slug ? 'border-brand/30 bg-brand text-brand-foreground' : 'border-line/70 bg-surface text-muted shadow-soft-sm hover:text-ink'}`}>{item.name}</button>)}</div>}

    {error ? <ErrorState message={error} onRetry={() => { setPage(0); setVideos([]); setRetryKey((value) => value + 1) }} /> : loading && page === 0 ? <VideoGridSkeleton count={8} /> : videos.length ? <>
      <div aria-live="polite" className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{videos.map((video) => <VideoCard key={video.id} video={video} />)}</div>
      {loading && <VideoGridSkeleton count={4} />}
      {hasMore && !loading && <div className="flex justify-center pt-1"><Button variant="raised" onClick={() => setPage((current) => current + 1)}>Load more videos <ArrowDownWideNarrow className="size-4" /></Button></div>}
    </> : !loading && <EmptyState title={query ? 'No videos matched that search' : 'No videos in this collection yet'} description={query ? 'Try a different title, creator, category, or tag.' : 'New videos will show up here when creators publish them.'} action={category !== 'all' || query ? 'Clear filters' : undefined} onAction={() => { setParams(new URLSearchParams()); setPage(0) }} />}
  </div>
}
