import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Link, useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, FileVideo2, ImagePlus, LoaderCircle, LockKeyhole, ShieldCheck, UploadCloud, X } from 'lucide-react'
import { sendEmailVerification } from 'firebase/auth'
import { useAuth } from '../components/auth/auth-context'
import { EmptyState } from '../components/ui/content-state'
import { Badge } from '../components/ui/badge'
import { Button, IconButton } from '../components/ui/button'
import { Input, Textarea } from '../components/ui/input'
import { useToast } from '../components/ui/toast-context'
import { apiRequest, jsonBody } from '../lib/api'
import { isFirebaseConfigured } from '../lib/firebase'
import { createUpload, fetchCategories } from '../services/videos'
import type { Category, Video } from '../types/video'

type ShellContext = { openAuth: () => void }
type UploadState = 'idle' | 'uploading' | 'completing' | 'success' | 'error' | 'cancelled'
type MultipartPart = { partNumber: number; url: string }
type NetworkInformationHint = { effectiveType?: string; saveData?: boolean }

const maxFileBytes = 2 * 1024 * 1024 * 1024
const supportedTypes: Record<string, string> = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mkv': 'video/x-matroska' }

function extension(fileName: string) {
  return fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
}

function prettySize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function probeDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => { const duration = video.duration; URL.revokeObjectURL(objectUrl); resolve(Number.isFinite(duration) ? Math.min(86_400, Math.floor(duration)) : 0) }
    video.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(0) }
    video.src = objectUrl
  })
}

class StorageTransferError extends Error {
  readonly status?: number
  readonly networkFailure: boolean

  constructor(message: string, status?: number, networkFailure = false) {
    super(message)
    this.name = 'StorageTransferError'
    this.status = status
    this.networkFailure = networkFailure
  }
}

function xhrPut(url: string, blob: Blob, contentType: string, onProgress: (loaded: number) => void, signal: AbortSignal) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.timeout = 0
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(event.loaded) }
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) return reject(new StorageTransferError(xhr.status === 403 ? 'The upload link expired.' : `Cloudflare R2 returned ${xhr.status}.`, xhr.status))
      resolve(xhr.getResponseHeader('ETag') || '')
    }
    xhr.onerror = () => reject(new StorageTransferError('The browser could not reach the R2 upload endpoint.', undefined, true))
    xhr.onabort = () => reject(new DOMException('Upload cancelled.', 'AbortError'))
    const abort = () => xhr.abort()
    signal.addEventListener('abort', abort, { once: true })
    xhr.onloadend = () => signal.removeEventListener('abort', abort)
    if (signal.aborted) return abort()
    xhr.send(blob)
  })
}

function waitForRetry(delayMs: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Upload cancelled.', 'AbortError'))
    const onAbort = () => {
      window.clearTimeout(timer)
      reject(new DOMException('Upload cancelled.', 'AbortError'))
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, delayMs)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

async function putWithRetry(
  initialUrl: string,
  refreshUrl: () => Promise<string>,
  blob: Blob,
  contentType: string,
  onProgress: (loaded: number) => void,
  signal: AbortSignal,
) {
  let url = initialUrl
  let lastError: StorageTransferError | undefined
  const maxAttempts = 7
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await xhrPut(url, blob, contentType, onProgress, signal)
    } catch (cause) {
      if (signal.aborted || (cause instanceof DOMException && cause.name === 'AbortError')) throw cause
      if (!(cause instanceof StorageTransferError)) throw cause
      lastError = cause
      const retryable = cause.networkFailure || cause.status === 403 || cause.status === 408 || cause.status === 429 || (cause.status !== undefined && cause.status >= 500)
      if (!retryable || attempt === maxAttempts - 1) break
      onProgress(0)
      await waitForRetry(Math.min(1000 * 2 ** attempt, 30_000), signal)
      url = await refreshUrl()
    }
  }

  if (lastError?.networkFailure) {
    throw new Error(`R2 could not be reached after ${maxAttempts} attempts. Check your connection; if it is online, check that bucket CORS allows PUT and Content-Type from ${window.location.origin}, and exposes ETag.`)
  }
  if (lastError?.status === 403) throw new Error('R2 rejected the refreshed upload link. Restart the upload and check the API R2 credentials.')
  throw new Error(lastError?.message ?? 'The upload could not finish. Retry when the connection is stable.')
}

export function UploadPage() {
  const { user, emailVerified, loading: authLoading, reloadUser } = useAuth()
  const { openAuth } = useOutletContext<ShellContext>()
  const { toast } = useToast()
  const navigate = useNavigate()
  const videoInput = useRef<HTMLInputElement>(null)
  const thumbnailInput = useRef<HTMLInputElement>(null)
  const thumbnailUrlRef = useRef('')
  const abortController = useRef<AbortController | null>(null)
  const activeVideoId = useRef('')
  const [file, setFile] = useState<File | null>(null)
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState('')
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [visibility, setVisibility] = useState<Video['visibility']>('public')
  const [status, setStatus] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [uploadedVideoId, setUploadedVideoId] = useState('')
  const [dragging, setDragging] = useState(false)
  const [verificationBusy, setVerificationBusy] = useState(false)

  async function resendVerificationEmail() {
    if (!user) return
    setVerificationBusy(true)
    try {
      await sendEmailVerification(user)
      toast(`Verification email sent to ${user.email || 'your inbox'}.`, 'success')
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : 'The verification email could not be sent. Try again shortly.', 'error')
    } finally {
      setVerificationBusy(false)
    }
  }

  async function refreshVerificationStatus() {
    setVerificationBusy(true)
    try {
      const verified = await reloadUser()
      toast(verified ? 'Email verified. You can upload now.' : 'Email verification is not complete yet. Open the link in your inbox, then refresh again.', verified ? 'success' : 'info')
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : 'Email status could not be refreshed. Try again.', 'error')
    } finally {
      setVerificationBusy(false)
    }
  }

  useEffect(() => {
    if (!isFirebaseConfigured) return
    void fetchCategories().then((result) => setCategories(result.categories.filter((item) => item.slug !== 'all' && item.id))).catch(() => undefined)
  }, [])

  useEffect(() => () => { if (thumbnailUrlRef.current) URL.revokeObjectURL(thumbnailUrlRef.current) }, [])

  function selectThumbnail(next: File | null) {
    if (thumbnailUrlRef.current) URL.revokeObjectURL(thumbnailUrlRef.current)
    thumbnailUrlRef.current = next ? URL.createObjectURL(next) : ''
    setThumbnailPreview(thumbnailUrlRef.current)
    setThumbnail(next)
  }

  function handleFile(next: File | undefined) {
    if (!next) return
    const ext = extension(next.name)
    if (!supportedTypes[ext] || (next.type && next.type !== supportedTypes[ext])) {
      toast('Choose an MP4, WebM, MOV, or MKV video file.', 'error')
      return
    }
    if (next.size > maxFileBytes) {
      toast('This file exceeds the 2 GB upload limit.', 'error')
      return
    }
    setFile(next)
    setTitle((current) => current || next.name.replace(/\.[^.]+$/, '').slice(0, 160))
    setStatus('idle')
    setError('')
    void probeDuration(next).then(setDurationSeconds)
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setDragging(false)
    handleFile(event.dataTransfer.files[0])
  }

  async function uploadThumbnailFor(videoId: string, signal: AbortSignal) {
    if (!thumbnail) return
    const contentType = thumbnail.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'
    const createUrl = () => apiRequest<{ uploadUrl: string }>(`/uploads/${videoId}/thumbnail`, {
      method: 'POST',
      body: jsonBody({ fileName: thumbnail.name, contentType, sizeBytes: thumbnail.size }),
      signal,
    })
    const result = await createUrl()
    await putWithRetry(result.uploadUrl, async () => (await createUrl()).uploadUrl, thumbnail, contentType, () => undefined, signal)
  }

  async function startUpload() {
    setError('')
    setWarning('')
    setProgress(0)
    if (!file || !title.trim()) {
      setError('Add a video file and title before uploading.')
      return
    }
    if (!user || !emailVerified) {
      setError('Verify your email before uploading. Open the confirmation link, then refresh your status here.')
      return
    }

    const controller = new AbortController()
    abortController.current = controller
    setStatus('uploading')
    try {
      const contentType = file.type || supportedTypes[extension(file.name)]
      const session = await createUpload({
        title: title.trim(),
        description,
        categoryId: categoryId || null,
        visibility,
        fileName: file.name,
        contentType,
        sizeBytes: file.size,
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 20),
      })
      activeVideoId.current = session.videoId

      if (thumbnail) {
        try { await uploadThumbnailFor(session.videoId, controller.signal) }
        catch { setWarning('The video uploaded, but its selected thumbnail was not saved.') }
      }

      let completedParts: Array<{ PartNumber: number; ETag: string }> = []
      if (session.multipart) {
        const partSize = session.partSize || 8 * 1024 * 1024
        const count = Math.ceil(file.size / partSize)
        const partNumbers = Array.from({ length: count }, (_, index) => index + 1)
        const signed = await apiRequest<{ parts: MultipartPart[] }>(`/uploads/${session.videoId}/parts`, {
          method: 'POST',
          body: jsonBody({ partNumbers }),
          signal: controller.signal,
        })
        const uploadedBytes = new Array<number>(count).fill(0)
        const etags = new Array<string>(count).fill('')
        let nextPart = 0
        const worker = async () => {
          while (nextPart < count) {
            const index = nextPart++
            const start = index * partSize
            const part = file.slice(start, Math.min(file.size, start + partSize))
            const descriptor = signed.parts.find((item) => item.partNumber === index + 1)
            if (!descriptor) throw new Error('A signed upload part is missing. Retry the upload.')
            const reportProgress = () => setProgress(Math.min(99, Math.round(uploadedBytes.reduce((sum, value) => sum + value, 0) / file.size * 100)))
            const etag = await putWithRetry(descriptor.url, async () => {
              const refreshed = await apiRequest<{ parts: MultipartPart[] }>(`/uploads/${session.videoId}/parts`, {
                method: 'POST',
                body: jsonBody({ partNumbers: [index + 1] }),
                signal: controller.signal,
              })
              const freshPart = refreshed.parts.find((item) => item.partNumber === index + 1)
              if (!freshPart) throw new Error('A fresh upload part link is missing. Retry the upload.')
              return freshPart.url
            }, part, contentType, (loaded) => {
              uploadedBytes[index] = loaded
              reportProgress()
            }, controller.signal)
            if (!etag) throw new Error('R2 did not return an ETag. Add ETag to the bucket CORS expose headers and retry.')
            etags[index] = etag
            uploadedBytes[index] = part.size
            reportProgress()
          }
        }
        const network = (navigator as Navigator & { connection?: NetworkInformationHint }).connection
        const concurrentParts = network?.saveData || network?.effectiveType === 'slow-2g' || network?.effectiveType === '2g'
          ? 1
          : network?.effectiveType === '4g' ? 3 : 2
        await Promise.all(Array.from({ length: Math.min(concurrentParts, count) }, () => worker()))
        completedParts = etags.map((ETag, index) => ({ PartNumber: index + 1, ETag }))
      } else {
        if (!session.uploadUrl) throw new Error('The upload link was missing. Retry to start a new session.')
        await putWithRetry(session.uploadUrl, async () => {
          const refreshed = await apiRequest<{ uploadUrl: string }>(`/uploads/${session.videoId}/url`, {
            method: 'POST',
            signal: controller.signal,
          })
          return refreshed.uploadUrl
        }, file, contentType, (loaded) => setProgress(Math.min(99, Math.round(loaded / file.size * 100))), controller.signal)
      }

      if (controller.signal.aborted) throw new DOMException('Upload cancelled.', 'AbortError')
      setProgress(100)
      setStatus('completing')
      await apiRequest(`/uploads/${session.videoId}/complete`, {
        method: 'POST',
        body: jsonBody({ parts: session.multipart ? completedParts : undefined, durationSeconds }),
        signal: controller.signal,
      })
      setUploadedVideoId(session.videoId)
      setStatus('success')
      toast('Your video is uploaded and ready to watch.', 'success')
    } catch (cause) {
      if (controller.signal.aborted || (cause instanceof DOMException && cause.name === 'AbortError')) {
        setStatus('cancelled')
        return
      }
      const message = cause instanceof Error ? cause.message : 'Upload failed. Check your connection and try again.'
      setError(message)
      setStatus('error')
      if (activeVideoId.current) void apiRequest(`/uploads/${activeVideoId.current}/abort`, { method: 'POST' }).catch(() => undefined)
    } finally {
      abortController.current = null
    }
  }

  async function cancelUpload() {
    abortController.current?.abort()
    const videoId = activeVideoId.current
    if (videoId) await apiRequest(`/uploads/${videoId}/abort`, { method: 'POST' }).catch(() => undefined)
    activeVideoId.current = ''
    setProgress(0)
    setStatus('cancelled')
    toast('Upload cancelled.', 'info')
  }

  function onVideoInput(event: ChangeEvent<HTMLInputElement>) { handleFile(event.target.files?.[0]) }
  function onThumbnailInput(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0]
    if (!next) return
    const accepted = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(next.type)
    if (!accepted || next.size > 10 * 1024 * 1024) { toast('Choose a JPG, PNG, WebP, or AVIF image under 10 MB.', 'error'); return }
    selectThumbnail(next)
  }

  if (authLoading) return <div className="neumorphic mx-auto max-w-3xl animate-pulse rounded-[28px] p-10 shadow-soft"><div className="h-5 w-1/3 rounded bg-lifted" /><div className="mt-5 h-52 rounded-2xl bg-lifted" /></div>

  if (!isFirebaseConfigured) return <div className="mx-auto max-w-2xl"><Link to="/" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" />Back to StreamX</Link><EmptyState title="Connect your creator account" description="Upload uses Firebase Auth and a private Cloudflare R2 bucket. Add the Firebase and API credentials in your environment to enable it." /></div>
  if (!user) return <div className="mx-auto max-w-2xl"><EmptyState title="Sign in to upload" description="Your uploads stay attached to your account, and you can choose who gets to watch each one." action="Sign in" onAction={openAuth} /></div>

  return <div className="mx-auto max-w-4xl animate-fade-up">
    <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" />Creator studio</Link>
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.17em] text-brand"><UploadCloud className="size-3.5" />Creator studio</p><h1 className="text-3xl font-extrabold tracking-[-0.06em] text-ink sm:text-[38px]">Upload a video</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted">Share a new story with the StreamX community.</p></div><Badge className="w-fit"><LockKeyhole className="size-3.5 text-mint" />Private R2 upload</Badge></div>

    {!emailVerified && <div role="alert" className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-300/[0.05] p-4 text-sm leading-6 text-amber-100/80">
      <p><strong className="text-amber-100">Verify your email to upload.</strong> Open the confirmation link sent to {user.email || 'your email address'}.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={verificationBusy} onClick={() => void resendVerificationEmail()}>{verificationBusy ? 'Please wait…' : 'Resend verification email'}</Button>
        <Button type="button" size="sm" variant="ghost" disabled={verificationBusy} onClick={() => void refreshVerificationStatus()}>I’ve verified — refresh</Button>
      </div>
    </div>}

    {status === 'success' ? <div className="neumorphic rounded-[28px] border border-mint/20 p-7 shadow-soft sm:p-9"><span className="flex size-12 items-center justify-center rounded-2xl bg-mint/10 text-mint"><CheckCircle2 className="size-6" /></span><h2 className="mt-5 text-2xl font-bold tracking-tight text-ink">Your video is ready</h2><p className="mt-2 text-sm leading-6 text-muted">{visibility === 'private' ? 'It is private and only visible to you.' : 'It is available according to the visibility setting you chose.'}</p>{warning && <p role="status" className="mt-3 text-xs text-amber-200">{warning}</p>}<div className="mt-6 flex flex-wrap gap-3"><Button variant="primary" onClick={() => navigate(`/watch/${uploadedVideoId}`)}>Open video</Button><Button variant="outline" onClick={() => navigate('/dashboard')}>View dashboard</Button><Button variant="ghost" onClick={() => { setFile(null); selectThumbnail(null); setTitle(''); setDescription(''); setTags(''); setProgress(0); setStatus('idle'); setUploadedVideoId('') }}>Upload another</Button></div></div> : <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        <div className="neumorphic rounded-[26px] border border-line/50 p-4 shadow-soft sm:p-5">
          <input ref={videoInput} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv" onChange={onVideoInput} className="sr-only" aria-label="Choose a video file" />
          <button type="button" onClick={() => videoInput.current?.click()} onDrop={onDrop} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} className={`flex min-h-52 w-full flex-col items-center justify-center rounded-[20px] border border-dashed px-5 py-8 text-center transition ${dragging ? 'border-brand bg-brand/[0.07]' : 'border-line bg-surface/60 hover:border-brand/50 hover:bg-brand/[0.025]'}`}>
            {file ? <><span className="flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand"><FileVideo2 className="size-6" /></span><span className="mt-3 max-w-full truncate text-sm font-bold text-ink">{file.name}</span><span className="mt-1 text-xs text-muted">{prettySize(file.size)}{durationSeconds ? ` · ${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, '0')}` : ''}</span><span className="mt-3 text-[11px] font-semibold text-brand">Choose a different file</span></> : <><span className="flex size-12 items-center justify-center rounded-2xl bg-lifted text-brand shadow-soft-sm"><UploadCloud className="size-5" /></span><span className="mt-4 text-sm font-bold text-ink">Drop your video here</span><span className="mt-1.5 text-xs text-muted">or <span className="font-semibold text-brand">browse files</span></span><span className="mt-4 text-[10px] text-dim">MP4, WebM, MOV, or MKV · up to 2 GB</span></>}
          </button>
        </div>

        <div className="neumorphic space-y-5 rounded-[26px] border border-line/50 p-5 shadow-soft sm:p-6">
          <label className="block space-y-2 text-xs font-semibold text-muted" htmlFor="video-title">Title <span className="text-brand">*</span><Input id="video-title" maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give your video a clear title" /></label>
          <label className="block space-y-2 text-xs font-semibold text-muted" htmlFor="video-description">Description<Textarea id="video-description" maxLength={10000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Tell people what they’re about to watch…" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 text-xs font-semibold text-muted" htmlFor="video-category">Category<select id="video-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="h-11 w-full rounded-2xl border border-line/70 bg-surface px-3.5 text-sm text-ink shadow-inset-sm outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/20"><option value="">Choose a category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="block space-y-2 text-xs font-semibold text-muted" htmlFor="video-visibility">Visibility<select id="video-visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as Video['visibility'])} className="h-11 w-full rounded-2xl border border-line/70 bg-surface px-3.5 text-sm text-ink shadow-inset-sm outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/20"><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select></label>
          </div>
          <label className="block space-y-2 text-xs font-semibold text-muted" htmlFor="video-tags">Tags <span className="font-normal text-dim">(comma separated, up to 20)</span><Input id="video-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="travel, field notes, short film" /></label>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="neumorphic rounded-[26px] border border-line/50 p-5 shadow-soft">
          <div className="flex items-center justify-between"><div><p className="text-xs font-bold text-ink">Thumbnail</p><p className="mt-1 text-[10px] text-muted">JPG, PNG, WebP, or AVIF</p></div><input ref={thumbnailInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={onThumbnailInput} className="sr-only" aria-label="Choose a thumbnail image" /><IconButton aria-label={thumbnail ? 'Change thumbnail' : 'Add thumbnail'} variant="raised" className="size-9" onClick={() => thumbnailInput.current?.click()}><ImagePlus className="size-4" /></IconButton></div>
          <button type="button" onClick={() => thumbnailInput.current?.click()} className="mt-4 flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-line bg-surface/70 text-dim transition hover:border-brand/40">{thumbnailPreview ? <img src={thumbnailPreview} alt="Selected thumbnail preview" className="size-full object-cover" /> : <span className="flex flex-col items-center gap-2 text-xs"><ImagePlus className="size-5" />Add a custom thumbnail</span>}</button>
          {thumbnail && <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted"><span className="truncate">{thumbnail.name}</span><IconButton aria-label="Remove thumbnail" variant="ghost" className="size-7" onClick={() => selectThumbnail(null)}><X className="size-3.5" /></IconButton></div>}
        </div>
        <div className="rounded-[24px] border border-line/50 bg-raised/70 p-5"><p className="flex items-center gap-2 text-xs font-bold text-ink"><ShieldCheck className="size-4 text-mint" />Upload details</p><ul className="mt-3 space-y-2.5 text-[11px] leading-5 text-muted"><li>• File uploads directly to Cloudflare R2.</li><li>• Large videos upload in 8 MB chunks; interrupted chunks retry automatically.</li><li>• Slow connections use fewer simultaneous chunks and have no fixed upload timeout. Upload links expire after 15 minutes and refresh when needed.</li><li>• Your video remains private in storage; playback links expire.</li></ul></div>
      </aside>

      <div className="lg:col-span-2">
        {error && <p role="alert" className="mb-4 rounded-2xl border border-red-300/20 bg-red-400/[0.06] px-4 py-3 text-xs leading-5 text-red-200">{error}</p>}
        {status === 'uploading' || status === 'completing' ? <div className="mb-5 rounded-2xl border border-line/70 bg-raised/70 p-4"><div className="flex items-center justify-between gap-4 text-xs"><span className="flex items-center gap-2 font-semibold text-ink">{status === 'completing' ? <LoaderCircle className="size-4 animate-spin text-brand" /> : <UploadCloud className="size-4 text-brand" />}{status === 'completing' ? 'Verifying upload…' : 'Uploading directly to R2…'}</span><span className="tabular-nums text-muted">{progress}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-surface shadow-inset-sm"><div className="h-full rounded-full bg-brand transition-[width] duration-150" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-[10px] text-dim">Slow uploads can take a while. Keep this tab open; interrupted chunks retry automatically.</p></div> : null}
        <div className="flex flex-wrap items-center justify-end gap-3">
          {(status === 'uploading' || status === 'completing') ? <Button variant="outline" onClick={() => void cancelUpload()}><X className="size-4" />Cancel upload</Button> : status === 'cancelled' ? <Button variant="outline" onClick={() => setStatus('idle')}>Upload cancelled</Button> : <Button variant="primary" size="lg" disabled={!file || !title.trim() || !emailVerified} onClick={() => void startUpload()}>{status === 'error' ? 'Retry upload' : 'Upload video'}<UploadCloud className="size-4" /></Button>}
        </div>
      </div>
    </div>}
  </div>
}
