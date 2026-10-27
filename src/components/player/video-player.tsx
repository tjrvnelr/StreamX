import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type Hls from 'hls.js'
import { CircleAlert, Expand, LoaderCircle, PictureInPicture2, RotateCw } from 'lucide-react'
import { Button } from '../ui/button'

type VideoPlayerProps = {
  src: string
  poster?: string
  title: string
  initialTime?: number
  subtitleUrl?: string
  onRefresh?: (currentTime: number) => Promise<string>
  onTime?: (currentTime: number, duration: number) => void
  onPlay?: () => void
  onPause?: (currentTime: number, duration: number) => void
  onEnded?: (currentTime: number, duration: number) => void
}

type QualityLevel = { index: number; height: number; bitrate: number }

function getQualityLevels(hls: Hls): QualityLevel[] {
  const levelsByHeight = new Map<number, QualityLevel>()
  hls.levels.forEach((level, index) => {
    if (!level.height) return
    const current = levelsByHeight.get(level.height)
    if (!current || level.bitrate > current.bitrate) levelsByHeight.set(level.height, { index, height: level.height, bitrate: level.bitrate })
  })
  return [...levelsByHeight.values()].sort((a, b) => b.height - a.height)
}

export function VideoPlayer({ src, poster, title, initialTime = 0, subtitleUrl, onRefresh, onTime, onPlay, onPause, onEnded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [retrySource, setRetrySource] = useState('')
  const [retryAt, setRetryAt] = useState(0)
  const [playbackRate, setPlaybackRate] = useState('1')
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([])
  const [qualitySelection, setQualitySelection] = useState('auto')
  const [customHeight, setCustomHeight] = useState('')
  const [customResolutionUsed, setCustomResolutionUsed] = useState(0)
  const [qualityError, setQualityError] = useState('')
  const [pipSupported] = useState(() => typeof document !== 'undefined' && Boolean(document.pictureInPictureEnabled))

  useEffect(() => {
    const video = videoRef.current
    const activeSrc = retrySource || src
    if (!video || !activeSrc) return
    let hls: Hls | undefined
    let cancelled = false
    setError('')
    setLoading(true)
    setQualityLevels([])
    setQualitySelection('auto')
    setCustomResolutionUsed(0)
    setQualityError('')
    const isHls = /\.m3u8(?:\?|$)/i.test(activeSrc)
    if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = activeSrc
    } else if (!isHls) {
      video.src = activeSrc
    } else {
      void import('hls.js').then(({ default: HlsClass }) => {
        if (cancelled) return
        if (!HlsClass.isSupported()) {
          setLoading(false)
          setError('HLS playback is not supported in this browser.')
          return
        }
        hls = new HlsClass({ enableWorker: true, lowLatencyMode: false })
        hlsRef.current = hls
        const updateQualityLevels = () => setQualityLevels(getQualityLevels(hls!))
        hls.loadSource(activeSrc)
        hls.attachMedia(video)
        hls.on(HlsClass.Events.MANIFEST_PARSED, () => { updateQualityLevels(); setLoading(false) })
        hls.on(HlsClass.Events.LEVELS_UPDATED, updateQualityLevels)
        hls.on(HlsClass.Events.ERROR, (_event, data) => {
          if (!data.fatal) return
          if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR) hls?.startLoad()
          else if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR) hls?.recoverMediaError()
          else setError('This video stream could not be loaded.')
        })
      }).catch(() => {
        if (!cancelled) {
          setLoading(false)
          setError('HLS playback could not be initialized. Retry playback.')
        }
      })
    }

    function onMetadata() {
      const resumeAt = retryAt || initialTime
      if (resumeAt > 0 && Number.isFinite(video.duration) && resumeAt < video.duration - 5) video.currentTime = resumeAt
      setLoading(false)
    }
    function onCanPlay() { setLoading(false) }
    function onMediaError() {
      if (video.error?.code === MediaError.MEDIA_ERR_ABORTED) return
      setLoading(false)
      setError(video.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ? 'This video format is not supported by your browser.' : 'Video playback stopped unexpectedly.')
    }
    video.addEventListener('loadedmetadata', onMetadata)
    video.addEventListener('canplay', onCanPlay)
    video.addEventListener('error', onMediaError)
    return () => {
      cancelled = true
      video.removeEventListener('loadedmetadata', onMetadata)
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('error', onMediaError)
      hls?.destroy()
      if (hlsRef.current === hls) hlsRef.current = null
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [src, retrySource, retryAt, attempt, initialTime])

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = Number(playbackRate)
  }, [playbackRate])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) void shellRef.current?.requestFullscreen()
    else void document.exitFullscreen()
  }, [])

  const handleShortcut = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null
    if (target?.isContentEditable || target?.matches('input, textarea, select, button, [role="textbox"]')) return
    const video = videoRef.current
    if (!video) return
    const key = event.key.toLowerCase()
    if (event.code === 'Space') {
      event.preventDefault()
      if (video.paused) void video.play().catch(() => undefined)
      else video.pause()
    } else if (key === 'arrowleft') {
      event.preventDefault()
      video.currentTime = Math.max(0, video.currentTime - 5)
    } else if (key === 'arrowright') {
      event.preventDefault()
      video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 5)
    } else if (key === 'arrowup') {
      event.preventDefault()
      video.volume = Math.min(1, video.volume + 0.05)
    } else if (key === 'arrowdown') {
      event.preventDefault()
      video.volume = Math.max(0, video.volume - 0.05)
    } else if (key === 'm') {
      video.muted = !video.muted
    } else if (key === 'f') {
      toggleFullscreen()
    }
  }, [toggleFullscreen])

  useEffect(() => {
    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [handleShortcut])

  function handlePlayerKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && event.key === ' ') event.preventDefault()
  }

  function changeQuality(value: string) {
    setQualitySelection(value)
    setQualityError('')
    setCustomResolutionUsed(0)
    if (value === 'custom') return
    if (hlsRef.current) hlsRef.current.currentLevel = value === 'auto' ? -1 : Number(value)
  }

  function applyCustomResolution() {
    const requestedHeight = Number(customHeight)
    if (!Number.isInteger(requestedHeight) || requestedHeight < 144 || requestedHeight > 4320) {
      setQualityError('Enter a height from 144 to 4320 pixels.')
      return
    }
    const available = qualityLevels
      .filter((level) => level.height <= requestedHeight)
      .sort((a, b) => b.height - a.height || b.bitrate - a.bitrate)
    const selected = available[0]
    if (!selected) {
      setQualityError(`This stream has no rendition at or below ${requestedHeight}p.`)
      return
    }
    if (hlsRef.current) hlsRef.current.currentLevel = selected.index
    setQualitySelection('custom')
    setCustomResolutionUsed(selected.height)
    setQualityError('')
  }

  async function togglePip() {
    const video = videoRef.current
    if (!video || !document.pictureInPictureEnabled) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await video.requestPictureInPicture()
    } catch {
      setError('Picture-in-picture could not be started in this browser.')
    }
  }

  async function retryPlayback() {
    setLoading(true)
    setError('')
    if (onRefresh) {
      try {
        const currentTime = videoRef.current?.currentTime ?? initialTime
        setRetryAt(currentTime)
        setRetrySource(await onRefresh(currentTime))
      }
      catch { setLoading(false); setError('Playback access could not be refreshed. Sign in again or retry in a moment.') }
    } else setAttempt((value) => value + 1)
  }

  return <div ref={shellRef} className="overflow-hidden rounded-[24px] border border-line/60 bg-black shadow-soft-lg" onKeyDown={handlePlayerKeyDown}>
    <div className="relative aspect-video bg-black">
      <video
        ref={videoRef}
        aria-label={title}
        controls
        playsInline
        preload="metadata"
        poster={poster}
        className="size-full bg-black object-contain"
        onTimeUpdate={(event) => onTime?.(event.currentTarget.currentTime, event.currentTarget.duration || 0)}
        onRateChange={(event) => setPlaybackRate(String(event.currentTarget.playbackRate))}
        onPlay={() => onPlay?.()}
        onPause={(event) => onPause?.(event.currentTarget.currentTime, event.currentTarget.duration || 0)}
        onEnded={(event) => onEnded?.(event.currentTarget.currentTime, event.currentTarget.duration || 0)}
      >
        {subtitleUrl && <track kind="captions" src={subtitleUrl} srcLang="en" label="English" default />}
        Your browser does not support HTML5 video.
      </video>
      {loading && !error && <div aria-live="polite" className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20"><LoaderCircle className="size-8 animate-spin text-white" /></div>}
      {error && <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-5 text-center backdrop-blur-sm"><CircleAlert className="size-7 text-red-300" /><p className="max-w-sm text-sm text-white">{error}</p><Button size="sm" variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => void retryPlayback()}><RotateCw className="size-3.5" />Retry playback</Button></div>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 bg-raised px-3 py-2 sm:px-4">
      <p className="hidden truncate text-[10px] text-muted sm:block">Shortcuts: Space play · ←/→ seek · ↑/↓ volume · M mute · F fullscreen</p>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <label className="flex h-8 items-center gap-2 rounded-xl bg-surface px-2.5 text-[10px] font-semibold text-muted shadow-inset-sm" htmlFor="playback-speed">Speed<select id="playback-speed" value={playbackRate} onChange={(event) => setPlaybackRate(event.target.value)} className="bg-transparent text-[10px] text-ink outline-none">{['0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2'].map((rate) => <option key={rate} value={rate}>{rate === '1' ? 'Normal' : `${rate}×`}</option>)}</select></label>
        {qualityLevels.length > 1 && <label className="flex h-8 items-center gap-2 rounded-xl bg-surface px-2.5 text-[10px] font-semibold text-muted shadow-inset-sm" htmlFor="playback-resolution">Resolution<select id="playback-resolution" value={qualitySelection} onChange={(event) => changeQuality(event.target.value)} className="max-w-28 bg-transparent text-[10px] text-ink outline-none"><option value="auto">Auto</option>{qualityLevels.map((level) => <option key={level.index} value={String(level.index)}>{level.height}p</option>)}<option value="custom">Custom max…</option></select></label>}
        {qualitySelection === 'custom' && qualityLevels.length > 1 && <div className="flex items-center gap-1.5"><label htmlFor="custom-resolution-height" className="sr-only">Custom maximum resolution height in pixels</label><input id="custom-resolution-height" type="number" min={144} max={4320} step={1} inputMode="numeric" value={customHeight} onChange={(event) => setCustomHeight(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyCustomResolution() } }} placeholder="720" className="h-8 w-16 rounded-lg border border-line bg-surface px-2 text-[10px] text-ink outline-none focus:border-violet/60" /><span className="text-[10px] text-muted">px</span><Button size="sm" variant="raised" className="h-8 rounded-lg px-2 text-[10px]" onClick={applyCustomResolution}>Apply</Button></div>}
        {customResolutionUsed > 0 && qualitySelection === 'custom' && <span role="status" className="text-[10px] text-muted">Using {customResolutionUsed}p available</span>}
        {pipSupported && <Button aria-label="Picture in picture" variant="ghost" size="icon" className="size-8 rounded-xl" onClick={() => void togglePip()}><PictureInPicture2 className="size-4" /></Button>}
        <Button aria-label="Toggle fullscreen" variant="ghost" size="icon" className="size-8 rounded-xl" onClick={toggleFullscreen}><Expand className="size-4" /></Button>
      </div>
      {qualityError && <p role="alert" className="w-full text-right text-[10px] text-red-300">{qualityError}</p>}
    </div>
  </div>
}
