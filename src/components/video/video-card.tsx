import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Bookmark, MoreHorizontal, Share2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatAge, formatDuration, formatViews, toggleSaved } from '../../services/videos'
import type { Video } from '../../types/video'
import { VideoArtwork } from './video-artwork'
import { useToast } from '../ui/toast-context'

function avatarInitials(name: string) {
  return name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
}

export function VideoCard({ video, compact = false, progressPercent }: { video: Video; compact?: boolean; progressPercent?: number }) {
  const { toast } = useToast()

  async function saveForLater() {
    try {
      await toggleSaved(video.id, 'watch_later')
      toast('Saved to Watch later.', 'success')
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : 'Could not save this video.', 'error')
    }
  }

  async function shareVideo() {
    const url = `${window.location.origin}/watch/${video.id}`
    try {
      if (navigator.share) await navigator.share({ title: video.title, url })
      else {
        await navigator.clipboard.writeText(url)
        toast('Video link copied to your clipboard.', 'success')
      }
    } catch (cause) {
      if (cause instanceof Error && cause.name !== 'AbortError') toast('Could not share this video.', 'error')
    }
  }

  return <article className="group min-w-0">
    <div className="relative mb-3 overflow-hidden rounded-[22px] bg-lifted shadow-soft-sm">
      <Link to={`/watch/${video.id}`} aria-label={`Watch ${video.title}`} className="relative block aspect-video overflow-hidden">
        <VideoArtwork video={video} className="size-full transition duration-500 group-hover:scale-[1.035]" />
        <span className="absolute bottom-2.5 right-2.5 rounded-lg bg-black/75 px-2 py-1 text-[10px] font-semibold tabular-nums text-white backdrop-blur-sm">{formatDuration(video.durationSeconds)}</span>
        {video.isPreview && <span className="absolute left-2.5 top-2.5 rounded-lg bg-black/65 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/90 backdrop-blur-sm">Preview</span>}
        {progressPercent !== undefined && <span aria-label={`${progressPercent}% watched`} className="absolute inset-x-0 bottom-0 h-1 bg-white/30"><span className="block h-full bg-brand" style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }} /></span>}
      </Link>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild><button aria-label={`More options for ${video.title}`} className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white opacity-100 backdrop-blur transition hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:opacity-0 sm:group-hover:opacity-100"><MoreHorizontal className="size-4" /></button></DropdownMenu.Trigger>
        <DropdownMenu.Portal><DropdownMenu.Content align="end" sideOffset={6} className="neumorphic z-50 min-w-48 rounded-2xl border border-line/70 p-1.5 shadow-soft-lg">
          <DropdownMenu.Item onSelect={() => void saveForLater()} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs text-muted outline-none hover:bg-lifted hover:text-ink"><Bookmark className="size-4" />Save to Watch later</DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => void shareVideo()} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs text-muted outline-none hover:bg-lifted hover:text-ink"><Share2 className="size-4" />Share video</DropdownMenu.Item>
        </DropdownMenu.Content></DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-lifted text-[10px] font-bold text-brand shadow-soft-sm">{avatarInitials(video.creator.displayName)}</span>
      <div className="min-w-0 flex-1">
        <Link to={`/watch/${video.id}`} className="line-clamp-2 text-[13px] font-bold leading-[1.45] text-ink transition hover:text-brand sm:text-sm">{video.title}</Link>
        <p className="mt-1.5 truncate text-[11px] font-medium text-muted">{video.creator.displayName}</p>
        <p className="mt-1 truncate text-[10px] text-dim">{formatViews(video.viewCount)} <span aria-hidden="true">·</span> {formatAge(video.publishedAt || video.createdAt)}</p>
      </div>
      {compact && video.category && <span className="hidden rounded-full bg-lifted/70 px-2.5 py-1 text-[9px] font-semibold text-muted xl:inline-flex">{video.category.name}</span>}
    </div>
  </article>
}
