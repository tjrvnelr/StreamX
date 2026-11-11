import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { allowedOrigins, env } from './config.js'
import {
  abortMultipartUpload,
  completeMultipartUpload,
  createMultipartUpload,
  createPartUrl,
  createSingleUploadUrl,
  getObjectHead,
  multipartPartSize,
  removeVideoObjects,
  signDownload,
  uploadUrlExpirySeconds,
} from './services/r2.service.js'

function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return { adminAuth: getAuth(), adminDb: getFirestore() }
  }

  let credential
  if (env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const raw = env.FIREBASE_SERVICE_ACCOUNT_KEY.trim()
    try {
      if (raw.startsWith('{')) {
        credential = cert(JSON.parse(raw) as ServiceAccount)
      } else if (fs.existsSync(raw)) {
        credential = cert(JSON.parse(fs.readFileSync(raw, 'utf-8')) as ServiceAccount)
      }
    } catch (e) {
      console.warn('[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e)
    }
  } else if (env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    credential = cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
  }

  try {
    const app = initializeApp(credential ? { credential } : {})
    return { adminAuth: getAuth(app), adminDb: getFirestore(app) }
  } catch (err) {
    console.warn('[firebase-admin] Initializing fallback Firebase Admin app:', err)
    const app = initializeApp()
    return { adminAuth: getAuth(app), adminDb: getFirestore(app) }
  }
}

const { adminAuth, adminDb } = initFirebaseAdmin()

const app = express()
app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin(origin, callback) {
    const isLocalDevelopmentOrigin = (() => {
      if (!origin || process.env.NODE_ENV === 'production') return false
      try {
        const parsed = new URL(origin)
        return parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
      } catch {
        return false
      }
    })()
    if (!origin || allowedOrigins.includes(origin) || isLocalDevelopmentOrigin) callback(null, true)
    else callback(new Error('Origin is not allowed'))
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  maxAge: 600,
}))
app.use(express.json({ limit: '256kb' }))

const generalLimiter = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false })
const uploadLimiter = rateLimit({ windowMs: 60 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false })
const partUrlLimiter = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false })
const playbackLimiter = rateLimit({ windowMs: 60_000, limit: 90, standardHeaders: true, legacyHeaders: false })
app.use('/api', generalLimiter)

function errorResponse(res: Response, status: number, message: string) {
  res.status(status).json({ error: message })
}

async function authenticate(req: Request, res: Response, optional = false) {
  const authorization = req.header('authorization') || ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    if (optional) return true
    errorResponse(res, 401, 'Sign in to continue.')
    return false
  }
  try {
    const decoded = await adminAuth.verifyIdToken(match[1])
    req.authUser = {
      id: decoded.uid,
      email: decoded.email,
      emailConfirmed: Boolean(decoded.email_verified),
    }
    return true
  } catch (cause) {
    const code = typeof cause === 'object' && cause !== null && 'code' in cause && typeof cause.code === 'string'
      ? cause.code
      : undefined
    console.warn('[auth] Firebase ID token verification failed', {
      name: cause instanceof Error ? cause.name : 'UnknownError',
      code,
    })
    const message = code === 'auth/id-token-expired'
      ? 'Your sign-in session expired. Refresh the page and sign in again.'
      : 'We could not verify your sign-in. Refresh the page and sign in again. If this continues, check that the frontend and API use the same Firebase project.'
    errorResponse(res, 401, message)
    return false
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  void authenticate(req, res).then((ok) => { if (ok) next() }).catch(() => errorResponse(res, 401, 'Your session could not be verified.'))
}

function requireVerifiedAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.authUser) return errorResponse(res, 401, 'Sign in to continue.')
  if (!req.authUser.emailConfirmed) return errorResponse(res, 403, 'Verify your email address before uploading.')
  next()
}

function optionalAuth(req: Request, res: Response, next: NextFunction) {
  void authenticate(req, res, true).then((ok) => { if (ok) next() }).catch(() => errorResponse(res, 401, 'Your session could not be verified.'))
}

const uploadSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(10_000).default(''),
  categoryId: z.string().nullable().optional(),
  visibility: z.enum(['public', 'unlisted', 'private']).default('private'),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']),
  sizeBytes: z.number().int().positive(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
})

const partUrlsSchema = z.object({ partNumbers: z.array(z.number().int().min(1).max(10_000)).min(1).max(500) })
const completeSchema = z.object({
  parts: z.array(z.object({ PartNumber: z.number().int().min(1).max(10_000), ETag: z.string().min(1).max(256) })).max(10_000).optional(),
  durationSeconds: z.number().int().min(0).max(86_400).default(0),
})
const thumbnailSchema = z.object({ fileName: z.string().trim().min(1).max(255), contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/avif']), sizeBytes: z.number().int().positive().max(10 * 1024 * 1024) })
const thumbnailBatchSchema = z.object({ videoIds: z.array(z.string().min(1)).min(1).max(50) })
const visibilitySchema = z.object({ visibility: z.enum(['public', 'unlisted', 'private']) })
const idSchema = z.string().min(1)
const uploadMimeByExtension: Record<string, string> = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mkv': 'video/x-matroska' }

async function getUploadSession(videoId: string, userId: string) {
  const snap = await adminDb.collection('uploadSessions').doc(videoId).get()
  if (!snap.exists) return null
  const data = snap.data()!
  if (data.userId !== userId) return null
  return { videoId, ...data } as { videoId: string; userId: string; objectKey: string; multipartUploadId: string | null; expectedSize: number; expectedContentType: string }
}

async function ownVideo(videoId: string, userId: string) {
  const snap = await adminDb.collection('videos').doc(videoId).get()
  if (!snap.exists) return null
  const data = snap.data()!
  if (data.userId !== userId) return null
  return { id: videoId, ...data } as { id: string; userId: string; sourceObjectKey: string; visibility: string; processingStatus: string; publishedAt: string | null; thumbnailKey: string | null }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'streamx-api' }))

app.post('/api/uploads', uploadLimiter, requireAuth, requireVerifiedAuth, async (req, res) => {
  const parsed = uploadSchema.safeParse(req.body)
  if (!parsed.success) return errorResponse(res, 400, 'Review the upload details and try again.')
  const user = req.authUser!
  if (!user.emailConfirmed) return errorResponse(res, 403, 'Verify your email before uploading.')
  const values = parsed.data
  if (values.sizeBytes > env.MAX_UPLOAD_BYTES) return errorResponse(res, 413, `This file exceeds the ${Math.floor(env.MAX_UPLOAD_BYTES / (1024 * 1024))} MB upload limit.`)
  const extension = path.extname(values.fileName).toLowerCase()
  if (!uploadMimeByExtension[extension] || uploadMimeByExtension[extension] !== values.contentType) return errorResponse(res, 415, 'Use an MP4, WebM, MOV, or MKV video with a matching file type.')

  let categoryName: string | null = null
  let categorySlug: string | null = null
  if (values.categoryId) {
    const categorySnap = await adminDb.collection('categories').doc(values.categoryId).get()
    if (!categorySnap.exists) return errorResponse(res, 400, 'Choose an available category.')
    const catData = categorySnap.data()!
    categoryName = catData.name || null
    categorySlug = catData.slug || null
  }

  const videoId = randomUUID()
  const objectKey = `videos/${videoId}/source/original${extension}`
  const multipart = values.sizeBytes >= 16 * 1024 * 1024
  let multipartUploadId: string | null = null

  let creatorDisplayName = 'StreamX creator'
  let creatorUsername: string | null = null
  let creatorAvatarUrl: string | null = null
  try {
    const profileSnap = await adminDb.collection('profiles').doc(user.id).get()
    if (profileSnap.exists) {
      const profileData = profileSnap.data()!
      creatorDisplayName = profileData.displayName || creatorDisplayName
      creatorUsername = profileData.username || null
      creatorAvatarUrl = profileData.avatarUrl || null
    }
  } catch {
    // Proceed with defaults if profile read fails
  }

  const tags = [...new Set(values.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))]

  try {
    await adminDb.collection('videos').doc(videoId).set({
      userId: user.id,
      title: values.title,
      description: values.description,
      categoryId: values.categoryId ?? null,
      categoryName,
      categorySlug,
      visibility: values.visibility,
      processingStatus: 'uploading',
      durationSeconds: 0,
      sourceObjectKey: objectKey,
      playbackManifestKey: null,
      thumbnailKey: null,
      viewCount: 0,
      publishedAt: null,
      tags,
      creatorDisplayName,
      creatorUsername,
      creatorAvatarUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  } catch {
    return errorResponse(res, 500, 'Upload setup failed. Please try again.')
  }

  try {
    if (multipart) multipartUploadId = await createMultipartUpload(objectKey, values.contentType)
    await adminDb.collection('uploadSessions').doc(videoId).set({
      userId: user.id,
      objectKey,
      multipartUploadId,
      expectedSize: values.sizeBytes,
      expectedContentType: values.contentType,
      createdAt: new Date().toISOString(),
    })
    const uploadUrl = multipart ? undefined : await createSingleUploadUrl(objectKey, values.contentType, values.sizeBytes)
    return res.status(201).json({
      videoId,
      objectKey,
      multipart,
      partSize: multipart ? multipartPartSize : undefined,
      uploadUrl,
      expiresAt: new Date(Date.now() + uploadUrlExpirySeconds * 1000).toISOString(),
    })
  } catch {
    if (multipartUploadId) await abortMultipartUpload(objectKey, multipartUploadId).catch(() => undefined)
    await adminDb.collection('videos').doc(videoId).delete().catch(() => undefined)
    return errorResponse(res, 502, 'Secure upload setup failed. Please try again.')
  }
})

app.post('/api/uploads/:videoId/parts', partUrlLimiter, requireAuth, requireVerifiedAuth, async (req, res) => {
  const videoId = idSchema.safeParse(req.params.videoId)
  const input = partUrlsSchema.safeParse(req.body)
  if (!videoId.success || !input.success) return errorResponse(res, 400, 'Invalid multipart upload request.')
  const session = await getUploadSession(videoId.data, req.authUser!.id)
  if (!session) return errorResponse(res, 404, 'Upload session not found.')
  if (!session.multipartUploadId) return errorResponse(res, 400, 'This upload does not use multipart mode.')
  const maxPart = Math.ceil(Number(session.expectedSize) / multipartPartSize)
  if (input.data.partNumbers.some((number) => number > maxPart)) return errorResponse(res, 400, 'Invalid upload part number.')
  try {
    const parts = await Promise.all(input.data.partNumbers.map(async (partNumber) => {
      const partOffset = (partNumber - 1) * multipartPartSize
      const partLength = Math.min(multipartPartSize, Number(session.expectedSize) - partOffset)
      return { partNumber, url: await createPartUrl(session.objectKey, session.multipartUploadId!, partNumber, partLength) }
    }))
    return res.json({ parts, expiresAt: new Date(Date.now() + uploadUrlExpirySeconds * 1000).toISOString() })
  } catch {
    return errorResponse(res, 502, 'Upload links could not be refreshed. Please retry the upload.')
  }
})

app.post('/api/uploads/:videoId/url', partUrlLimiter, requireAuth, requireVerifiedAuth, async (req, res) => {
  const videoId = idSchema.safeParse(req.params.videoId)
  if (!videoId.success) return errorResponse(res, 400, 'Invalid upload identifier.')
  const [session, video] = await Promise.all([
    getUploadSession(videoId.data, req.authUser!.id),
    ownVideo(videoId.data, req.authUser!.id),
  ])
  if (!session || !video) return errorResponse(res, 404, 'Upload session not found.')
  if (session.multipartUploadId) return errorResponse(res, 400, 'This upload uses multipart mode.')
  if (video.processingStatus !== 'uploading') return errorResponse(res, 409, 'This upload is no longer active.')
  try {
    const uploadUrl = await createSingleUploadUrl(session.objectKey, session.expectedContentType, Number(session.expectedSize))
    return res.json({ uploadUrl, expiresAt: new Date(Date.now() + uploadUrlExpirySeconds * 1000).toISOString() })
  } catch {
    return errorResponse(res, 502, 'A fresh upload link could not be created. Retry the upload.')
  }
})

app.post('/api/uploads/:videoId/complete', uploadLimiter, requireAuth, requireVerifiedAuth, async (req, res) => {
  const videoId = idSchema.safeParse(req.params.videoId)
  const input = completeSchema.safeParse(req.body)
  if (!videoId.success || !input.success) return errorResponse(res, 400, 'Invalid upload completion request.')
  const session = await getUploadSession(videoId.data, req.authUser!.id)
  if (!session) return errorResponse(res, 404, 'Upload session not found.')

  try {
    if (session.multipartUploadId) {
      const parts = input.data.parts
      const expectedParts = Math.ceil(Number(session.expectedSize) / multipartPartSize)
      if (!parts || parts.length !== expectedParts || parts.some((part, index) => part.PartNumber !== index + 1)) return errorResponse(res, 400, 'Some upload parts are missing. Retry the upload.')
      await completeMultipartUpload(session.objectKey, session.multipartUploadId, parts)
    }
    const head = await getObjectHead(session.objectKey)
    if (Number(head.ContentLength) !== Number(session.expectedSize) || head.ContentType !== session.expectedContentType) {
      await removeVideoObjects(videoId.data).catch(() => undefined)
      await adminDb.collection('videos').doc(videoId.data).update({ processingStatus: 'failed', updatedAt: new Date().toISOString() })
      await adminDb.collection('uploadSessions').doc(videoId.data).delete().catch(() => undefined)
      return errorResponse(res, 422, 'The uploaded file did not match its declared type or size.')
    }
    const video = await ownVideo(videoId.data, req.authUser!.id)
    if (!video) return errorResponse(res, 404, 'Video record not found.')
    const publishedAt = video.visibility === 'private' ? null : new Date().toISOString()
    await adminDb.collection('videos').doc(videoId.data).update({
      processingStatus: 'ready',
      durationSeconds: input.data.durationSeconds,
      publishedAt,
      updatedAt: new Date().toISOString(),
    })
    await adminDb.collection('uploadSessions').doc(videoId.data).delete().catch(() => undefined)
    return res.json({ ok: true, videoId: videoId.data, processingStatus: 'ready' })
  } catch {
    return errorResponse(res, 502, 'The upload could not be verified. Retry completion or restart the upload.')
  }
})

app.post('/api/uploads/:videoId/thumbnail', uploadLimiter, requireAuth, requireVerifiedAuth, async (req, res) => {
  const videoId = idSchema.safeParse(req.params.videoId)
  const input = thumbnailSchema.safeParse(req.body)
  if (!videoId.success || !input.success) return errorResponse(res, 400, 'Choose a JPG, PNG, WebP, or AVIF image under 10 MB.')
  const extension = path.extname(input.data.fileName).toLowerCase()
  const allowedExtensions: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif' }
  if (allowedExtensions[extension] !== input.data.contentType) return errorResponse(res, 415, 'The thumbnail extension and image type must match.')
  const video = await ownVideo(videoId.data, req.authUser!.id)
  if (!video || video.processingStatus === 'deleting') return errorResponse(res, 404, 'Video not found.')
  const key = `videos/${videoId.data}/thumbnails/thumbnail${extension}`
  try {
    const url = await createSingleUploadUrl(key, input.data.contentType, input.data.sizeBytes)
    await adminDb.collection('videos').doc(videoId.data).update({ thumbnailKey: key, updatedAt: new Date().toISOString() })
    return res.json({ uploadUrl: url, expiresAt: new Date(Date.now() + uploadUrlExpirySeconds * 1000).toISOString() })
  } catch {
    return errorResponse(res, 502, 'Thumbnail upload could not be prepared.')
  }
})

app.post('/api/uploads/:videoId/abort', uploadLimiter, requireAuth, requireVerifiedAuth, async (req, res) => {
  const videoId = idSchema.safeParse(req.params.videoId)
  if (!videoId.success) return errorResponse(res, 400, 'Invalid upload identifier.')
  const [session, video] = await Promise.all([
    getUploadSession(videoId.data, req.authUser!.id),
    ownVideo(videoId.data, req.authUser!.id),
  ])
  if (!session && !video) return errorResponse(res, 404, 'Upload session not found.')
  if (video && video.processingStatus !== 'uploading') return errorResponse(res, 409, 'This video has already finished uploading.')
  if (session?.multipartUploadId) await abortMultipartUpload(session.objectKey, session.multipartUploadId).catch(() => undefined)
  await removeVideoObjects(videoId.data).catch(() => undefined)
  await adminDb.collection('videos').doc(videoId.data).delete().catch(() => undefined)
  await adminDb.collection('uploadSessions').doc(videoId.data).delete().catch(() => undefined)
  return res.json({ ok: true })
})

app.post('/api/media/thumbnails', playbackLimiter, optionalAuth, async (req, res) => {
  const input = thumbnailBatchSchema.safeParse(req.body)
  if (!input.success) return errorResponse(res, 400, 'Invalid thumbnail request.')
  const uniqueIds = [...new Set(input.data.videoIds)]
  const snapshots = await Promise.all(uniqueIds.map((id) => adminDb.collection('videos').doc(id).get()))
  const now = Date.now()
  type ThumbnailVideo = {
    id: string
    userId: string
    thumbnailKey: string | null
    visibility: string
    processingStatus: string
    publishedAt: string | null
  }
  const allowed = snapshots
    .filter((snap) => snap.exists)
    .map((snap) => ({ id: snap.id, ...snap.data()! } as ThumbnailVideo))
    .filter((video) => {
      const publicReady = video.processingStatus === 'ready' && (video.visibility === 'public' || video.visibility === 'unlisted') && video.publishedAt
      return Boolean(publicReady || (req.authUser && video.userId === req.authUser.id))
    })
    .filter((video): video is ThumbnailVideo & { thumbnailKey: string } => Boolean(video.thumbnailKey))
  try {
    const thumbnails = Object.fromEntries(await Promise.all(allowed.map(async (video) => [video.id, await signDownload(video.thumbnailKey, 15 * 60)] as const)))
    return res.json({ thumbnails, expiresAt: new Date(now + 15 * 60_000).toISOString() })
  } catch {
    return errorResponse(res, 502, 'Video artwork could not be signed.')
  }
})

app.get('/api/videos/:videoId/playback', playbackLimiter, optionalAuth, async (req, res) => {
  const videoId = idSchema.safeParse(req.params.videoId)
  if (!videoId.success) return errorResponse(res, 404, 'Video not found.')
  const snap = await adminDb.collection('videos').doc(videoId.data).get()
  if (!snap.exists) return errorResponse(res, 404, 'Video not found.')
  const video = { id: snap.id, ...snap.data()! } as Record<string, unknown>
  if (video.processingStatus !== 'ready') return errorResponse(res, 404, 'Video not found.')
  const publicReady = (video.visibility === 'public' || video.visibility === 'unlisted') && Boolean(video.publishedAt) && new Date(video.publishedAt as string).getTime() <= Date.now()
  const owner = Boolean(req.authUser && req.authUser.id === video.userId)
  if (!publicReady && !owner) return errorResponse(res, 404, 'Video not found.')
  try {
    const expiresIn = 60 * 60
    const playbackUrl = await signDownload(video.sourceObjectKey as string, expiresIn)
    return res.json({ playbackUrl, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() })
  } catch {
    return errorResponse(res, 502, 'Playback access could not be prepared. Please retry.')
  }
})

app.post('/api/videos/:videoId/view', playbackLimiter, optionalAuth, async (req, res) => {
  const videoId = idSchema.safeParse(req.params.videoId)
  if (!videoId.success) return errorResponse(res, 404, 'Video not found.')
  const snap = await adminDb.collection('videos').doc(videoId.data).get()
  if (!snap.exists) return errorResponse(res, 404, 'Video not found.')
  const video = snap.data()!
  const publicReady = video.processingStatus === 'ready' && (video.visibility === 'public' || video.visibility === 'unlisted') && Boolean(video.publishedAt) && new Date(video.publishedAt).getTime() <= Date.now()
  if (!publicReady) return errorResponse(res, 404, 'Video not found.')
  try {
    await adminDb.collection('videos').doc(videoId.data).update({ viewCount: FieldValue.increment(1) })
    return res.json({ ok: true })
  } catch {
    return errorResponse(res, 500, 'View count could not be recorded.')
  }
})

app.post('/api/videos/:videoId/visibility', uploadLimiter, requireAuth, requireVerifiedAuth, async (req, res) => {
  const videoId = idSchema.safeParse(req.params.videoId)
  const input = visibilitySchema.safeParse(req.body)
  if (!videoId.success || !input.success) return errorResponse(res, 400, 'Choose a valid visibility setting.')
  const video = await ownVideo(videoId.data, req.authUser!.id)
  if (!video || video.processingStatus !== 'ready') return errorResponse(res, 404, 'Ready video not found.')
  const publishedAt = input.data.visibility === 'private' ? null : video.publishedAt ?? new Date().toISOString()
  try {
    await adminDb.collection('videos').doc(videoId.data).update({ visibility: input.data.visibility, publishedAt, updatedAt: new Date().toISOString() })
    return res.json({ ok: true })
  } catch {
    return errorResponse(res, 500, 'Visibility could not be changed.')
  }
})

app.delete('/api/videos/:videoId', uploadLimiter, requireAuth, requireVerifiedAuth, async (req, res) => {
  const videoId = idSchema.safeParse(req.params.videoId)
  if (!videoId.success) return errorResponse(res, 400, 'Invalid video identifier.')
  const video = await ownVideo(videoId.data, req.authUser!.id)
  if (!video) return errorResponse(res, 404, 'Video not found.')
  const session = await getUploadSession(videoId.data, req.authUser!.id)
  if (session?.multipartUploadId) await abortMultipartUpload(session.objectKey, session.multipartUploadId).catch(() => undefined)
  await adminDb.collection('videos').doc(videoId.data).update({ processingStatus: 'deleting', updatedAt: new Date().toISOString() })
  try {
    await removeVideoObjects(videoId.data)
  } catch {
    return errorResponse(res, 502, 'Storage cleanup is pending. Retry deletion from your dashboard.')
  }
  await adminDb.collection('videos').doc(videoId.data).delete().catch(() => undefined)
  return res.json({ ok: true })
})

app.use('/api', (_req, res) => errorResponse(res, 404, 'API route not found.'))
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  void _next
  if (error instanceof SyntaxError) return errorResponse(res, 400, 'Invalid request body.')
  if (error instanceof Error && error.message === 'Origin is not allowed') return errorResponse(res, 403, 'This application origin is not allowed.')
  return errorResponse(res, 500, 'The server could not complete this request.')
})

// Serve the frontend static files in production
const distPath = path.resolve(import.meta.dirname, '..', 'dist')
app.use(express.static(distPath))
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

if (process.env.NODE_ENV !== 'test') {
  app.listen(env.PORT, () => { console.info(`StreamX API listening on port ${env.PORT}`) })
}

export { app }
