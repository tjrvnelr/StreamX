import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Play, Sparkles } from 'lucide-react'
import { VideoCard } from '../components/video/video-card'
import { EmptyState, ErrorState, VideoGridSkeleton } from '../components/ui/content-state'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { isSupabaseConfigured } from '../lib/supabase'
import { fetchCatalog, fetchCategories, fetchContinueWatching, formatDuration, formatViews } from '../services/videos'
import { previewFeatured } from '../data/preview-videos'
import type { Category, Video } from '../types/video'

type ContinueItem = { video: Video; progressSeconds: number }

function SectionTitle({ eyebrow, title, to }: { eyebrow?: string; title: string; to?: string }) {
  return <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
    <div>{eyebrow && <p className="mb-1.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-brand">{eyebrow}</p>}<h2 className="text-lg font-bold tracking-[-0.04em] text-ink sm:text-xl">{title}</h2></div>
    {to && <Link to={to} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted transition hover:text-brand">See all <ArrowRight className="size-3.5" /></Link>}
  </div>
}

export function HomePage() {
  const [recommended, setRecommended] = useState<Video[]>([])
  const [trending, setTrending] = useState<Video[]>([])
  const [fresh, setFresh] = useState<Video[]>([])
  const [continueWatching, setContinueWatching] = useState<ContinueItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [featured, setFeatured] = useState<Video | null>(isSupabaseConfigured ? null : previewFeatured)
  const [preview, setPreview] = useState(!isSupabaseConfigured)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const load = useCallback(async (category = selectedCategory) => {
    setLoading(true)
    setError('')
    try {
      const [forYou, popular, recent, categoryResult, continueItems] = await Promise.all([
        fetchCatalog({ category, pageSize: 8 }),
        fetchCatalog({ sort: 'popular', pageSize: 6 }),
        fetchCatalog({ sort: 'newest', pageSize: 8 }),
        fetchCategories(),
        fetchContinueWatching(),
      ])
      setRecommended(forYou.videos)
      setTrending(popular.videos)
      setFresh(recent.videos)
      setCategories(categoryResult.categories)
      setContinueWatching(continueItems)
      setPreview(forYou.preview || recent.preview)
      setFeatured(forYou.videos[0] ?? recent.videos[0] ?? popular.videos[0] ?? (forYou.preview ? previewFeatured : null))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Videos could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [selectedCategory])

  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => { if (active) void load() })
    return () => { active = false }
  }, [load])

  return <div className="animate-fade-up space-y-9 sm:space-y-11">
    {preview && <div role="status" className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-brand/20 bg-brand/[0.06] px-4 py-2.5 text-[11px] leading-5 text-muted"><Sparkles className="size-3.5 shrink-0 text-brand" /><span><strong className="font-bold text-ink">Preview mode.</strong> Sample titles and counts are illustrative; configure Supabase to browse live catalog data.</span></div>}

    {error ? <ErrorState message={error} onRetry={() => void load()} /> : <>
      {featured ? <section aria-label="Featured video" className="relative isolate min-h-[360px] overflow-hidden rounded-[30px] border border-line/50 bg-raised shadow-soft sm:min-h-[400px] lg:min-h-[440px]">
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_82%_18%,rgba(139,112,255,0.25),transparent_40%),linear-gradient(130deg,#172b38_0%,#24223b_50%,#11151c_100%)]" />
        {featured.thumbnailUrl && <img src={featured.thumbnailUrl} alt="" fetchPriority="high" onError={(event) => event.currentTarget.remove()} className="absolute inset-0 -z-20 size-full object-cover" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0a0c10]/95 via-[#0a0c10]/60 to-[#0a0c10]/5" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0a0c10]/60 via-transparent to-[#0a0c10]/10" />
        <div className="flex min-h-[360px] max-w-2xl flex-col items-start justify-end px-6 py-8 sm:min-h-[400px] sm:px-9 sm:py-10 lg:min-h-[440px] lg:px-12 lg:py-12">
          <div className="mb-5 flex flex-wrap items-center gap-2"><Badge className="border-white/15 bg-white/10 text-white/85"><Sparkles className="size-3 text-brand" />Featured for you</Badge>{featured.category && <Badge className="border-white/15 bg-black/20 text-white/80">{featured.category.name}</Badge>}</div>
          <h1 className="max-w-xl text-[clamp(2rem,5vw,3.6rem)] font-extrabold leading-[1.04] tracking-[-0.065em] text-white">{featured.title}</h1>
          <p className="mt-4 line-clamp-2 max-w-lg text-sm leading-6 text-white/75 sm:text-[15px]">{featured.description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-white/70"><span>{featured.creator.displayName}</span><span aria-hidden="true">·</span><span>{formatViews(featured.viewCount)}</span><span aria-hidden="true">·</span><span>{formatDuration(featured.durationSeconds)}</span></div>
          <div className="mt-7 flex flex-wrap gap-3"><Button variant="primary" size="lg" className="rounded-2xl px-5" onClick={() => navigate(`/watch/${featured.id}`)}><Play className="size-4 fill-current" />Watch now</Button><Button variant="outline" size="lg" className="border-white/15 bg-black/20 text-white hover:bg-white/10" onClick={() => navigate(`/watch/${featured.id}`)}>More details <ArrowUpRight className="size-4" /></Button></div>
        </div>
        <span className="absolute bottom-5 right-5 rounded-xl border border-white/15 bg-black/30 px-3 py-1.5 text-[10px] font-semibold text-white/80 backdrop-blur">{formatDuration(featured.durationSeconds)}</span>
      </section> : loading ? <div aria-label="Loading featured video" className="min-h-[360px] animate-pulse rounded-[30px] bg-raised shadow-inset-sm sm:min-h-[400px] lg:min-h-[440px]" /> : <EmptyState title="Your feed is ready for its first video" description="When creators publish videos, they will appear here. Explore categories or try a search to get started." action="Explore videos" onAction={() => navigate('/explore')} />}

      <section aria-label="Video categories" className="scrollbar-hidden -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {(categories.length ? categories : [{ name: 'All', slug: 'all' }]).map((category) => <button key={category.slug} type="button" onClick={() => setSelectedCategory(category.slug)} aria-pressed={selectedCategory === category.slug} className={`whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-semibold transition ${selectedCategory === category.slug ? 'border-brand/35 bg-brand text-brand-foreground shadow-accent' : 'border-line/70 bg-surface text-muted shadow-soft-sm hover:text-ink'}`}>{category.name}</button>)}
      </section>

      {continueWatching.length > 0 && <section aria-label="Continue watching">
        <SectionTitle eyebrow="Pick up where you left off" title="Continue watching" to="/library?tab=history" />
        <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {continueWatching.slice(0, 4).map(({ video, progressSeconds }) => <VideoCard key={video.id} video={video} progressPercent={Math.round(progressSeconds / Math.max(video.durationSeconds, 1) * 100)} />)}
        </div>
      </section>}

      <section aria-label="Recommended videos">
        <SectionTitle eyebrow="A good place to start" title={selectedCategory === 'all' ? 'Picked for you' : `Explore ${categories.find((item) => item.slug === selectedCategory)?.name ?? 'videos'}`} to="/explore" />
        {loading ? <VideoGridSkeleton count={4} /> : recommended.length ? <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{recommended.slice(0, 8).map((video) => <VideoCard key={video.id} video={video} />)}</div> : <EmptyState title="Nothing here just yet" description="Try another category or search the full catalog." action="Browse everything" onAction={() => setSelectedCategory('all')} />}
      </section>

      {trending.length > 0 && <section aria-label="Trending videos">
        <SectionTitle eyebrow="People are watching" title="Trending now" to="/trending" />
        <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">{trending.slice(0, 3).map((video) => <VideoCard key={video.id} video={video} compact />)}</div>
      </section>}

      {fresh.length > 0 && <section aria-label="Recently uploaded">
        <SectionTitle eyebrow="Just landed" title="Freshly uploaded" to="/explore?sort=newest" />
        <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{fresh.slice(0, 4).map((video) => <VideoCard key={video.id} video={video} />)}</div>
      </section>}
      {loading && <VideoGridSkeleton count={4} />}
    </>}
  </div>
}
