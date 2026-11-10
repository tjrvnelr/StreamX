import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Search, Sparkles } from 'lucide-react'
import { fetchCatalog } from '../../services/videos'
import type { Video } from '../../types/video'
import { VideoArtwork } from '../video/video-artwork'

export function SearchBox({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Video[]>([])
  const [resultQuery, setResultQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) return
    let active = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      void fetchCatalog({ query: trimmed, pageSize: 5 }).then((result) => {
        if (!active) return
        setSuggestions(result.videos)
        setResultQuery(trimmed)
        setActiveIndex(-1)
      }).catch(() => { if (active) { setSuggestions([]); setResultQuery(trimmed) } }).finally(() => { if (active) setLoading(false) })
    }, 220)
    return () => { active = false; window.clearTimeout(timer) }
  }, [query])

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutside)
    return () => document.removeEventListener('mousedown', closeOnOutside)
  }, [])

  function submit(event?: FormEvent) {
    event?.preventDefault()
    const value = query.trim()
    if (!value) return
    setOpen(false)
    navigate(`/search?q=${encodeURIComponent(value)}`)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') setOpen(false)
    if (!suggestions.length) return
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1)) }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, -1)) }
    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      setOpen(false)
      navigate(`/watch/${suggestions[activeIndex].id}`)
    }
  }

  return <div className={`relative w-full ${compact ? 'max-w-full' : 'max-w-[620px]'}`} ref={boxRef}>
    <form role="search" onSubmit={submit} className="relative flex items-center">
      <Search aria-hidden="true" className="pointer-events-none absolute left-4 size-[17px] text-dim" />
      <input
        type="search"
        value={query}
        onChange={(event) => { setQuery(event.target.value); setLoading(event.target.value.trim().length >= 2); if (!event.target.value.trim()) { setSuggestions([]); setResultQuery('') } }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        aria-label="Search videos"
        aria-expanded={open && suggestions.length > 0}
        aria-controls="search-suggestions"
        autoComplete="off"
        placeholder="Search videos, creators, and more"
        className="h-11 w-full rounded-2xl border border-line/70 bg-surface pl-11 pr-[76px] text-sm text-ink shadow-inset-sm placeholder:text-dim focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/10"
      />
      {query && <button type="button" onClick={() => { setQuery(''); setSuggestions([]); setResultQuery(''); setLoading(false) }} className="absolute right-[54px] rounded-lg px-2 py-1 text-[11px] text-dim hover:text-ink">Clear</button>}
      <button type="submit" aria-label="Submit search" className="absolute right-1.5 flex size-8 items-center justify-center rounded-xl bg-lifted/80 text-muted transition hover:bg-brand hover:text-brand-foreground"><Search className="size-4" /></button>
    </form>
    {open && query.trim().length >= 2 && <div id="search-suggestions" role="listbox" aria-label="Search suggestions" className="neumorphic absolute left-0 right-0 top-[calc(100%+10px)] z-40 overflow-hidden rounded-2xl border border-line/70 p-2 shadow-soft-lg">
      {loading || resultQuery !== query.trim() ? <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted"><Sparkles className="size-3.5 animate-pulse" />Searching StreamX…</div>
        : suggestions.length ? <>
          {suggestions.map((video, index) => <button key={video.id} type="button" role="option" aria-selected={activeIndex === index} onMouseDown={(event) => event.preventDefault()} onClick={() => { setOpen(false); navigate(`/watch/${video.id}`) }} className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition ${activeIndex === index ? 'bg-brand/10' : 'hover:bg-lifted/70'}`}>
            <VideoArtwork video={video} className="size-12 shrink-0 rounded-lg bg-lifted" />
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-ink">{video.title}</span><span className="mt-1 block truncate text-[11px] text-muted">{video.creator.displayName}</span></span>
            <ArrowUpRight className="size-4 shrink-0 text-dim" />
          </button>)}
          <button type="button" onClick={() => submit()} className="mt-1 flex w-full items-center justify-between border-t border-line/60 px-3 py-3 text-left text-xs font-semibold text-brand hover:text-ink">See all results <ArrowUpRight className="size-3.5" /></button>
        </> : <div className="px-3 py-3 text-xs text-muted">No suggestions yet. Press Enter to search the full catalog.</div>}
    </div>}
  </div>
}
