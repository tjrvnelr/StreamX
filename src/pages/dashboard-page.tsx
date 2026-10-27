import { useCallback, useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { ArrowUpRight, CheckCircle2, CircleAlert, Clock3, Eye, FileVideo2, Pencil, Plus, RefreshCw, Trash2, UploadCloud } from 'lucide-react'
import { useAuth } from '../components/auth/auth-context'
import { EditVideoDialog } from '../components/video/edit-video-dialog'
import { VideoArtwork } from '../components/video/video-artwork'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/content-state'
import { Badge } from '../components/ui/badge'
import { Button, IconButton } from '../components/ui/button'
import { useToast } from '../components/ui/toast-context'
import { isSupabaseConfigured } from '../lib/supabase'
import { deleteVideo, fetchCreatorMetrics, fetchOwnerVideos, formatAge, formatViews, updateVideoVisibility, type CreatorMetrics } from '../services/videos'
import type { Video } from '../types/video'

type ShellContext = { openAuth: () => void }

function statusStyle(status: string) {
  if (status === 'ready') return 'border-mint/20 bg-mint/[0.06] text-mint'
  if (status === 'failed') return 'border-red-300/20 bg-red-400/[0.06] text-red-200'
  if (status === 'deleting') return 'border-red-300/20 bg-red-400/[0.06] text-red-200'
  return 'border-amber-300/20 bg-amber-300/[0.06] text-amber-100'
}

function statusLabel(status: string) {
  if (status === 'ready') return 'Ready'
  if (status === 'failed') return 'Failed'
  if (status === 'deleting') return 'Deleting'
  if (status === 'uploading') return 'Uploading'
  if (status === 'processing') return 'Processing'
  return 'Uploaded'
}

function StatCard({ label, value, icon: Icon, note }: { label: string; value: string; icon: typeof Eye; note: string }) {
  return <div className="neumorphic rounded-[22px] border border-line/50 p-4 shadow-soft-sm sm:p-5"><div className="flex items-start justify-between"><p className="text-[11px] font-semibold text-muted">{label}</p><span className="flex size-9 items-center justify-center rounded-xl bg-lifted text-violet"><Icon className="size-4" /></span></div><p className="mt-4 text-2xl font-extrabold tracking-[-0.05em] text-ink">{value}</p><p className="mt-1.5 text-[10px] text-dim">{note}</p></div>
}

export function DashboardPage() {
  const { user } = useAuth()
  const { openAuth } = useOutletContext<ShellContext>()
  const { toast } = useToast()
  const [videos, setVideos] = useState<Video[]>([])
  const [metrics, setMetrics] = useState<CreatorMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Video | null>(null)
  const [savingVisibility, setSavingVisibility] = useState('')
  const [deleting, setDeleting] = useState('')

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !user) { setLoading(false); return }
    setLoading(true)
    setError('')
    try {
      const [list, currentMetrics] = await Promise.all([fetchOwnerVideos(), fetchCreatorMetrics()])
      setVideos(list)
      setMetrics(currentMetrics)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Creator dashboard could not be loaded.') }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => { if (active) void load() })
    return () => { active = false }
  }, [load])

  async function changeVisibility(video: Video, visibility: Video['visibility']) {
    setSavingVisibility(video.id)
    try {
      await updateVideoVisibility(video.id, visibility)
      await load()
      toast('Video visibility updated.', 'success')
    } catch (cause) { toast(cause instanceof Error ? cause.message : 'Visibility could not be updated.', 'error') }
    finally { setSavingVisibility('') }
  }

  async function remove(video: Video) {
    if (!window.confirm(`Delete “${video.title}” and its stored media? This cannot be undone.`)) return
    setDeleting(video.id)
    try {
      await deleteVideo(video.id)
      setVideos((current) => current.filter((item) => item.id !== video.id))
      await load()
      toast('Video and its R2 objects were deleted.', 'success')
    } catch (cause) { toast(cause instanceof Error ? cause.message : 'Video deletion is pending. Retry from the dashboard.', 'error') }
    finally { setDeleting('') }
  }

  if (!user) return <div className="mx-auto max-w-2xl"><EmptyState title="Sign in to manage your videos" description={isSupabaseConfigured ? 'Your creator dashboard only shows uploads owned by your account.' : 'Connect Supabase and sign in to open creator tools.'} action={isSupabaseConfigured ? 'Sign in' : undefined} onAction={isSupabaseConfigured ? openAuth : undefined} /></div>

  return <div className="animate-fade-up space-y-8">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.17em] text-violet"><FileVideo2 className="size-3.5" />Creator studio</p><h1 className="text-3xl font-extrabold tracking-[-0.06em] text-ink sm:text-[38px]">Your uploads</h1><p className="mt-2 text-sm text-muted">Manage your videos and keep an eye on the real numbers.</p></div><Link to="/upload"><Button variant="primary"><Plus className="size-4" />Upload video</Button></Link></header>

    {loading && !metrics ? <LoadingState label="Loading creator metrics" /> : error && !metrics ? <ErrorState message={error} onRetry={() => void load()} /> : <>
      {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.05] px-4 py-3 text-xs text-amber-100"><span>{error}</span><button onClick={() => void load()} className="font-semibold underline">Retry</button></div>}
      <section aria-label="Creator metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total videos" value={String(metrics?.total_videos ?? 0)} icon={FileVideo2} note="All uploads on your account" />
        <StatCard label="Total views" value={formatViews(Number(metrics?.total_views ?? 0)).replace(' views', '')} icon={Eye} note="Views across your videos" />
        <StatCard label="Published" value={String(metrics?.published_videos ?? 0)} icon={CheckCircle2} note="Ready and public" />
        <StatCard label="Unpublished" value={String(metrics?.unpublished_videos ?? 0)} icon={UploadCloud} note="Private or not ready" />
        <StatCard label="Processing" value={String(metrics?.processing_videos ?? 0)} icon={Clock3} note="Uploads in progress" />
        <StatCard label="Failed" value={String(metrics?.failed_videos ?? 0)} icon={CircleAlert} note="Uploads needing attention" />
      </section>

      <section aria-label="Recent uploads" className="space-y-4">
        <div className="flex items-end justify-between"><div><h2 className="text-lg font-bold tracking-tight text-ink">Recent uploads</h2><p className="mt-1 text-xs text-muted">Your latest 100 uploads, newest first.</p></div><IconButton aria-label="Refresh dashboard" variant="raised" className="size-9" onClick={() => void load()}><RefreshCw className="size-4" /></IconButton></div>
        {videos.length ? <div className="space-y-3">{videos.map((video) => <article key={video.id} className="neumorphic grid gap-4 rounded-[24px] border border-line/50 p-4 shadow-soft-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <Link to={`/watch/${video.id}`} aria-label={`Open ${video.title}`} className="aspect-video w-28 shrink-0 overflow-hidden rounded-xl bg-lifted sm:w-36"><VideoArtwork video={video} className="size-full" /></Link>
            <div className="min-w-0 flex-1"><Link to={`/watch/${video.id}`} className="line-clamp-2 text-sm font-bold leading-5 text-ink hover:text-violet">{video.title}</Link><p className="mt-1.5 truncate text-[10px] text-muted">{formatViews(video.viewCount)} <span className="px-1">·</span> {formatAge(video.createdAt)} <span className="px-1">·</span> {video.category?.name || 'Uncategorized'}</p><div className="mt-2 flex flex-wrap items-center gap-2"><Badge className={statusStyle(video.processingStatus)}>{video.processingStatus === 'failed' ? <CircleAlert className="size-3" /> : null}{statusLabel(video.processingStatus)}</Badge><Badge>{video.visibility}</Badge></div></div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3 sm:justify-end sm:border-0 sm:pt-0">
            <label className="sr-only" htmlFor={`visibility-${video.id}`}>Visibility for {video.title}</label><select id={`visibility-${video.id}`} disabled={video.processingStatus !== 'ready' || savingVisibility === video.id} value={video.visibility} onChange={(event) => void changeVisibility(video, event.target.value as Video['visibility'])} className="h-9 rounded-xl border border-line/70 bg-surface px-3 text-[10px] font-semibold text-muted shadow-inset-sm outline-none focus:border-violet/60 disabled:opacity-45"><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select>
            <Button variant="ghost" size="sm" className="h-9 px-2.5 text-[10px]" onClick={() => setEditing(video)}><Pencil className="size-3.5" /><span>Edit</span></Button>
            {video.processingStatus === 'ready' && <Link to={`/watch/${video.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[10px] font-semibold text-muted hover:bg-lifted hover:text-ink">View<ArrowUpRight className="size-3.5" /></Link>}
            <IconButton aria-label={`Delete ${video.title}`} variant="ghost" className="size-9 text-dim hover:bg-red-400/10 hover:text-red-200" disabled={deleting === video.id} onClick={() => void remove(video)}>{deleting === video.id ? <RefreshCw className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</IconButton>
          </div>
        </article>)}</div> : !loading && <EmptyState title="No uploads yet" description="When you publish your first video, its processing status and real view counts will appear here." action="Upload a video" onAction={() => window.location.assign('/upload')} />}
      </section>
      {editing && <EditVideoDialog key={editing.id} video={editing} open onOpenChange={(open) => { if (!open) setEditing(null) }} onSaved={() => { setEditing(null); void load() }} />}
      <div className="rounded-2xl border border-line/50 bg-raised/50 px-4 py-3 text-[10px] leading-5 text-dim"><span className="font-semibold text-muted">Storage note:</span> video bytes stay in private Cloudflare R2. Deletion removes the R2 prefix before removing the metadata; failed cleanup leaves the record available for a retry.</div>
    </>}
  </div>
}
