import { useState } from 'react'
import { Video as VideoIcon } from 'lucide-react'
import type { Video } from '../../types/video'

const palettes: Record<string, string> = {
  travel: 'from-[#182b3a] via-[#252544] to-[#11151d]',
  documentary: 'from-[#323047] via-[#27283e] to-[#13171e]',
  nature: 'from-[#1a352f] via-[#263b3d] to-[#11181b]',
  design: 'from-[#382c3c] via-[#302b49] to-[#15151e]',
  music: 'from-[#392633] via-[#32253e] to-[#15151e]',
  'short-films': 'from-[#3a2a34] via-[#312941] to-[#15151e]',
  default: 'from-[#252b3a] via-[#292641] to-[#12151c]',
}

export function VideoArtwork({ video, className = '' }: { video: Video; className?: string }) {
  const [failed, setFailed] = useState(false)
  const palette = palettes[video.category?.slug ?? ''] ?? palettes.default

  return <div className={`relative overflow-hidden ${className}`}>
    {video.thumbnailUrl && !failed ? <img src={video.thumbnailUrl} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" /> : <div aria-hidden="true" className={`absolute inset-0 bg-gradient-to-br ${palette}`}>
      <div className="absolute -right-8 -top-12 size-40 rounded-full bg-brand/15 blur-3xl" />
      <div className="absolute -bottom-10 left-[28%] h-[75%] w-[82%] -skew-x-12 rounded-[48%] border border-white/[0.08] bg-white/[0.025] shadow-[0_-18px_60px_rgba(140,112,255,0.08)]" />
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
      <VideoIcon aria-hidden="true" className="absolute right-4 top-4 size-5 text-white/25" />
      <div className="absolute bottom-3 left-4 right-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/55">{video.category?.name ?? 'StreamX'}</p>
        <p className="mt-1 line-clamp-2 text-xs font-bold leading-snug text-white/90">{video.title}</p>
      </div>
    </div>}
  </div>
}
