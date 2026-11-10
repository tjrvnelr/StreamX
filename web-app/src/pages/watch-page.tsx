import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, Bookmark, Heart, Link2, ListVideo, LockKeyhole, Play, Share2, UserRound } from 'lucide-react'
import { VideoPlayer } from '../components/player/video-player'
import { VideoCard } from '../components/video/video-card'
import { AddToPlaylistDialog } from '../components/video/add-to-playlist-dialog'
import { Button, IconButton } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/content-state'
import { useToast } from '../components/ui/toast-context'
import { ApiError } from '../lib/api'
import { isFirebaseConfigured } from '../lib/firebase'
import { fetchCatalog, fetchProgress, fetchVideo, formatAge, formatViews, getPlaybackUrl, isSaved, recordView, saveProgress, toggleSaved } from '../services/videos'
import type { Video } from '../types/video'

type ShellContext = { openAuth: () => void }

function prettyTime(seconds: number) {
  const safe = Math.floor(Math.max(0, seconds))
  const minutes = Math.floor(safe / 60)
  const remaining = safe % 60
  return `${minutes}:${String(remaining).padStart(2, '0')}`
}

export function WatchPage() {
  const { id = '' } = useParams()
  const { openAuth } = useOutletContext<ShellContext>()
  const { toast } = useToast()
  const [video, setVideo] = useState<Video | null>(null)
  const [related, setRelated] = useState<Video[]>([])
  const [src, setSrc] = useState('')
  const [resumeAt, setResumeAt] = useState(0)
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const lastWriteAt = useRef(0)
  const viewed = useRef(false)
  const loadToken = useRef(0)

  const load = useCallback(async () => {
    const token = ++loadToken.current
    setLoading(true)
    setError('')
    setNeedsSignIn(false)
    setSrc('')
    setVideo(null)
    setResumeAt(0)
    setLiked(false)
    setSaved(false)
    viewed.current = false
    try {
      const result = await fetchVideo(id)
      if (token !== loadToken.current) return
      if (!result.video) {
        setError('This video may have been removed or is not available to your account.')
        return
      }
      const current = result.video
      setVideo(current)
      if (result.preview && current.playbackUrl) setSrc(current.playbackUrl)
      else {
        const playback = await getPlaybackUrl(current.id)
        if (token !== loadToken.current) return
        setSrc(playback.playbackUrl)
      }
      if (!result.preview) {
        const [progress, likedState, savedState] = await Promise.all([
          fetchProgress(current.id),
          isSaved(current.id, 'video_likes'),
          isSaved(current.id, 'watch_later'),
        ])
        if (token !== loadToken.current) return
        if (progress && !progress.completed && progress.progress_seconds > 10) {
          setResumeAt(progress.progress_seconds)
        }
        setLiked(likedState)
        setSaved(savedState)
      }
      void fetchCatalog({ sort: 'popular', pageSize: 8 }).then((results) => {
        if (token === loadToken.current) setRelated(results.videos.filter((item) => item.id !== current.id).slice(0, 6))
      }).catch(() => { if (token === loadToken.current) setRelated([]) })
    } catch (cause) {
      if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) setNeedsSignIn(cause.status === 401)
      setError(cause instanceof Error ? cause.message : 'This video could not be opened.')
    } finally {
      if (token === loadToken.current) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => { if (active) void load() })
    return () => { active = false }
  }, [load])

  const handleTime = useCallback((current: number, duration: number) => {
    if (!video || video.isPreview || !isFirebaseConfigured || current < 2) return
    if (current - lastWriteAt.current >= 15) {
      lastWriteAt.current = current
      void saveProgress(video.id, current, duration).catch(() => undefined)
    }
  }, [video])

  const persistProgress = useCallback((current: number, duration: number) => {
    if (!video || video.isPreview || !isFirebaseConfigured || current < 2) return
    lastWriteAt.current = current
    void saveProgress(video.id, current, duration).catch((cause: unknown) => toast(cause instanceof Error ? cause.message : 'Progress could not be saved.', 'error'))
  }, [video, toast])

  async function handlePlay() {
    if (video && !video.isPreview && !viewed.current) {
      viewed.current = true
      void recordView(video.id).catch(() => undefined)
    }
  }

  async function toggleLike() {
    if (!video) return
    try { setLiked(await toggleSaved(video.id, 'video_likes')) }
    catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not update your likes.', 'error') }
  }

  async function toggleWatchLater() {
    if (!video) return
    try {
      setSaved(await toggleSaved(video.id, 'watch_later'))
      toast(saved ? 'Removed from Watch later.' : 'Saved to Watch later.', 'success')
    } catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not update Watch later.', 'error') }
  }

  async function share() {
    if (!video) return
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: video.title, url })
      else { await navigator.clipboard.writeText(url); toast('Video link copied.', 'success') }
    } catch (cause) {
      if (cause instanceof Error && cause.name !== 'AbortError') toast('Could not share this video.', 'error')
    }
  }

  if (loading) return <LoadingState label="Opening your video" />
  if (error || !video) return <div className="mx-auto max-w-3xl space-y-4"><Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" />Back to StreamX</Link>{needsSignIn ? <div className="neumorphic rounded-[26px] border border-line/60 px-7 py-9 text-center shadow-soft"><span className="mx-auto flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand"><LockKeyhole className="size-5" /></span><h1 className="mt-4 text-xl font-bold text-ink">Sign in to watch this video</h1><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">This video is private. Sign in with the account that owns it to continue.</p><Button variant="primary" className="mt-5" onClick={openAuth}>Sign in to continue <Play className="size-4" /></Button></div> : <ErrorState message={error || 'This video is no longer available.'} onRetry={() => void load()} />}</div>

  return <div className="animate-fade-up">
    <div className="mb-5 flex items-center gap-2 text-[11px] font-medium text-muted"><Link to="/" className="hover:text-ink">Home</Link><span aria-hidden="true">/</span><span className="truncate text-ink">{video.title}</span></div>
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0">
        {src ? <VideoPlayer key={video.id} src={src} poster={video.thumbnailUrl} title={video.title} initialTime={resumeAt} onRefresh={video.isPreview ? undefined : async () => (await getPlaybackUrl(video.id)).playbackUrl} onTime={handleTime} onPlay={() => void handlePlay()} onPause={persistProgress} onEnded={persistProgress} /> : <div className="flex aspect-video items-center justify-center rounded-[24px] bg-raised"><LoadingState label="Preparing playback" /></div>}
        {resumeAt > 0 && <p role="status" className="mt-3 rounded-xl bg-brand/[0.07] px-3.5 py-2.5 text-xs text-muted">Ready to resume at <strong className="font-bold text-brand">{prettyTime(resumeAt)}</strong>. Use the player controls to continue.</p>}
        <div className="mt-5 flex flex-col gap-4 border-b border-line/60 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-2">{video.category && <Badge>{video.category.name}</Badge>}{video.isPreview && <Badge className="border-brand/20 bg-brand/5 text-brand">Preview video</Badge>}</div><h1 className="text-xl font-extrabold leading-tight tracking-[-0.045em] text-ink sm:text-[26px]">{video.title}</h1><p className="mt-2 text-xs text-muted">{formatViews(video.viewCount)} <span className="px-1 text-dim">·</span> {formatAge(video.publishedAt || video.createdAt)}</p></div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant={liked ? 'primary' : 'raised'} size="sm" className="h-10 rounded-full px-3.5" onClick={() => void toggleLike()}><Heart className={`size-4 ${liked ? 'fill-current' : ''}`} /><span className="hidden sm:inline">{liked ? 'Liked' : 'Like'}</span></Button>
            <Button variant={saved ? 'outline' : 'raised'} size="sm" className="h-10 rounded-full px-3.5" onClick={() => void toggleWatchLater()}><Bookmark className={`size-4 ${saved ? 'fill-current text-brand' : ''}`} /><span className="hidden sm:inline">{saved ? 'Saved' : 'Watch later'}</span></Button>
            <Button variant="raised" size="sm" className="h-10 rounded-full px-3.5" onClick={() => setPlaylistOpen(true)}><ListVideo className="size-4" /><span className="hidden sm:inline">Playlist</span></Button>
            <IconButton aria-label="Share video" variant="raised" className="size-10" onClick={() => void share()}><Share2 className="size-4" /></IconButton>
          </div>
        </div>
        <div className="my-5 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-lifted text-brand shadow-soft-sm"><UserRound className="size-5" /></span><div className="min-w-0"><p className="truncate text-sm font-bold text-ink">{video.creator.displayName}</p><p className="truncate text-[11px] text-muted">{video.creator.username ? `@${video.creator.username}` : 'StreamX creator'}</p></div></div>
          <Button variant="outline" size="sm" className="rounded-full px-4" onClick={() => toast(video.isPreview ? 'Creator profiles will be available with live catalog data.' : 'Creator profile is coming soon.', 'info')}>Creator profile</Button>
        </div>
        <div className="rounded-2xl border border-line/60 bg-raised/60 p-4 sm:p-5">
          <div className={`text-sm leading-6 text-muted ${descriptionOpen ? '' : 'line-clamp-3'}`}>{video.description || 'No description was added for this video.'}</div>
          {video.description.length > 170 && <button type="button" onClick={() => setDescriptionOpen((value) => !value)} className="mt-2 text-xs font-bold text-ink hover:text-brand">{descriptionOpen ? 'Show less' : 'Show more'}</button>}
        </div>
        {video.isPreview && <p className="mt-3 flex items-center gap-2 text-[10px] leading-5 text-dim"><Link2 className="size-3.5 shrink-0" />Preview clip uses the Creative Commons sample flower video; title and view data are illustrative.</p>}
      </section>
      <aside className="space-y-4 xl:sticky xl:top-28">
        <div className="flex items-center justify-between"><h2 className="text-sm font-bold text-ink">Up next</h2><Link to="/trending" className="text-[10px] font-semibold text-muted hover:text-brand">Trending</Link></div>
        {related.length ? <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-1">{related.map((item) => <VideoCard key={item.id} video={item} compact />)}</div> : <EmptyState title="No related videos yet" description="Explore the catalog to find another story." />}
      </aside>
    </div>
    <AddToPlaylistDialog open={playlistOpen} onOpenChange={setPlaylistOpen} videoId={video.id} />
  </div>
}
