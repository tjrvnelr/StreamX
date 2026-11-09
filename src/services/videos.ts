import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
} from 'firebase/firestore'
import type { Query, QuerySnapshot, DocumentData } from 'firebase/firestore'
import { apiRequest, jsonBody } from '../lib/api'
import { auth, db } from '../lib/firebase'
import { previewCategories, previewVideos } from '../data/preview-videos'
import type { Category, Video, VideoSearchOptions, VideoSearchResult } from '../types/video'

async function getDocsWithFallback<T = DocumentData>(
  primaryQuery: Query<T>,
  fallbackQuery: Query<T>,
): Promise<QuerySnapshot<T>> {
  try {
    return await getDocs(primaryQuery)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const code = (err as { code?: string })?.code
    if (code === 'failed-precondition' || msg.includes('requires an index') || msg.includes('indexes?create_composite=')) {
      console.warn('Firestore composite index missing or building; falling back to in-memory sorting.', msg)
      return await getDocs(fallbackQuery)
    }
    throw err
  }
}

type FirestoreVideoDoc = Record<string, unknown> & {
  userId: string
  title: string
  description: string
  thumbnailKey: string | null
  categoryId: string | null
  categoryName: string | null
  categorySlug: string | null
  durationSeconds: number
  visibility: Video['visibility']
  processingStatus: string
  viewCount: number
  publishedAt: string | null
  createdAt: string
  creatorDisplayName: string
  creatorUsername: string | null
  creatorAvatarUrl: string | null
  tags: string[]
}

function mapVideo(id: string, data: FirestoreVideoDoc): Video {
  return {
    id,
    title: data.title,
    description: data.description ?? '',
    thumbnailKey: data.thumbnailKey,
    thumbnailUrl: undefined,
    durationSeconds: Number(data.durationSeconds ?? 0),
    visibility: data.visibility,
    processingStatus: data.processingStatus,
    viewCount: Number(data.viewCount ?? 0),
    publishedAt: data.publishedAt,
    createdAt: data.createdAt,
    creator: {
      displayName: data.creatorDisplayName || 'StreamX creator',
      username: data.creatorUsername || null,
      avatarUrl: data.creatorAvatarUrl || null,
    },
    category: data.categoryName
      ? { id: data.categoryId ?? '', name: data.categoryName, slug: data.categorySlug ?? '' }
      : null,
  }
}

async function signThumbnails(videos: Video[]): Promise<Video[]> {
  const ids = videos.filter((video) => video.thumbnailKey).map((video) => video.id)
  if (!ids.length) return videos
  try {
    const result = await apiRequest<{ thumbnails: Record<string, string> }>('/media/thumbnails', {
      method: 'POST',
      body: jsonBody({ videoIds: ids }),
    })
    return videos.map((video) => ({ ...video, thumbnailUrl: result.thumbnails[video.id] }))
  } catch {
    return videos
  }
}

export function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const remaining = safe % 60
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
    : `${minutes}:${String(remaining).padStart(2, '0')}`
}

export function formatViews(views: number) {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1).replace(/\.0$/, '')}M views`
  if (views >= 1_000) return `${(views / 1_000).toFixed(1).replace(/\.0$/, '')}K views`
  return `${views} views`
}

export function formatAge(date: string) {
  const ageMs = Math.max(0, Date.now() - new Date(date).getTime())
  const days = Math.floor(ageMs / 86_400_000)
  if (days < 1) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
  const months = Math.floor(days / 30)
  return `${Math.max(1, months)} ${months === 1 ? 'month' : 'months'} ago`
}

export async function fetchCatalog(options: VideoSearchOptions = {}): Promise<VideoSearchResult> {
  const { query: searchQuery = '', category = 'all', sort = 'relevance', page = 0, pageSize = 24 } = options
  if (!db) {
    const normalized = searchQuery.trim().toLowerCase()
    let matches = previewVideos.filter((video) => {
      const categoryMatches = category === 'all' || video.category?.slug === category
      const queryMatches = !normalized || `${video.title} ${video.description} ${video.creator.displayName} ${video.category?.name}`.toLowerCase().includes(normalized)
      return categoryMatches && queryMatches
    })
    if (sort === 'popular') matches = [...matches].sort((a, b) => b.viewCount - a.viewCount)
    if (sort === 'newest') matches = [...matches].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    const start = page * pageSize
    return { videos: matches.slice(start, start + pageSize), preview: true, hasMore: start + pageSize < matches.length }
  }

  const videosRef = collection(db, 'videos')
  const filters: Parameters<typeof query>[1][] = [
    where('visibility', '==', 'public'),
    where('processingStatus', '==', 'ready'),
  ]

  if (category !== 'all') {
    filters.push(where('categorySlug', '==', category))
  }

  const orderClauses: Parameters<typeof query>[1][] = []
  if (sort === 'popular') {
    orderClauses.push(orderBy('viewCount', 'desc'))
  } else if (sort === 'newest') {
    orderClauses.push(orderBy('publishedAt', 'desc'))
  } else {
    orderClauses.push(orderBy('publishedAt', 'desc'))
  }

  const fetchCount = (page + 1) * pageSize + 1
  const primaryQuery = query(videosRef, ...filters, ...orderClauses, firestoreLimit(fetchCount))
  const fallbackQuery = query(videosRef, ...filters, firestoreLimit(Math.max(fetchCount, 50)))

  const snapshot = await getDocsWithFallback(primaryQuery, fallbackQuery)
  let allVideos = snapshot.docs.map((docSnap) => mapVideo(docSnap.id, docSnap.data() as FirestoreVideoDoc))

  const now = Date.now()
  allVideos = allVideos.filter((v) => v.publishedAt && new Date(v.publishedAt).getTime() <= now)

  if (sort === 'popular') {
    allVideos.sort((a, b) => b.viewCount - a.viewCount)
  } else if (sort === 'newest') {
    allVideos.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  } else {
    allVideos.sort((a, b) => +new Date(b.publishedAt || b.createdAt) - +new Date(a.publishedAt || a.createdAt))
  }

  if (searchQuery.trim()) {
    const normalized = searchQuery.trim().toLowerCase()
    allVideos = allVideos.filter((video) =>
      `${video.title} ${video.description} ${video.creator.displayName} ${video.category?.name || ''}`.toLowerCase().includes(normalized)
    )
  }

  const start = page * pageSize
  const sliced = allVideos.slice(start, start + pageSize)
  return { videos: await signThumbnails(sliced), preview: false, hasMore: allVideos.length > start + pageSize }
}

export async function fetchCategories(): Promise<{ categories: Category[]; preview: boolean }> {
  if (!db) return { categories: previewCategories, preview: true }
  const snapshot = await getDocs(query(collection(db, 'categories'), orderBy('name')))
  const categories: Category[] = [{ name: 'All', slug: 'all' }]
  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data()
    categories.push({ id: docSnap.id, name: data.name, slug: data.slug })
  })
  return { categories, preview: false }
}

export async function fetchVideo(id: string): Promise<{ video: Video | null; preview: boolean }> {
  if (!db) return { video: previewVideos.find((video) => video.id === id) ?? null, preview: true }
  const docSnap = await getDoc(doc(db, 'videos', id))
  if (!docSnap.exists()) return { video: null, preview: false }
  const video = mapVideo(docSnap.id, docSnap.data() as FirestoreVideoDoc)
  const signed = await signThumbnails([video])
  return { video: signed[0], preview: false }
}

export async function fetchOwnerVideos(): Promise<Video[]> {
  if (!db || !auth?.currentUser) return []
  const userId = auth.currentUser.uid
  const primary = query(
    collection(db, 'videos'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    firestoreLimit(100),
  )
  const fallback = query(collection(db, 'videos'), where('userId', '==', userId), firestoreLimit(100))
  const snapshot = await getDocsWithFallback(primary, fallback)
  const videos = snapshot.docs.map((docSnap) => mapVideo(docSnap.id, docSnap.data() as FirestoreVideoDoc))
  videos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return signThumbnails(videos)
}

export async function getPlaybackUrl(videoId: string) {
  return apiRequest<{ playbackUrl: string; expiresAt: string }>(`/videos/${encodeURIComponent(videoId)}/playback`)
}

export async function recordView(videoId: string) {
  return apiRequest<{ ok: true }>(`/videos/${encodeURIComponent(videoId)}/view`, { method: 'POST' })
}

export async function saveProgress(videoId: string, seconds: number, duration: number) {
  if (!db || !auth?.currentUser || !Number.isFinite(seconds) || seconds < 0) return
  const userId = auth.currentUser.uid
  const completed = duration > 0 && seconds / duration >= 0.95
  const docId = `${userId}_${videoId}`
  await setDoc(doc(db, 'watchHistory', docId), {
    userId,
    videoId,
    progressSeconds: Math.floor(seconds),
    completed,
    lastWatchedAt: new Date().toISOString(),
  }, { merge: true })
}

export async function fetchProgress(videoId: string) {
  if (!db || !auth?.currentUser) return null
  const userId = auth.currentUser.uid
  const docId = `${userId}_${videoId}`
  const docSnap = await getDoc(doc(db, 'watchHistory', docId))
  if (!docSnap.exists()) return null
  const data = docSnap.data()
  return { progress_seconds: data.progressSeconds as number, completed: data.completed as boolean }
}

export async function fetchContinueWatching(): Promise<Array<{ video: Video; progressSeconds: number }>> {
  if (!db || !auth?.currentUser) return []
  const userId = auth.currentUser.uid
  const primary = query(
    collection(db, 'watchHistory'),
    where('userId', '==', userId),
    where('completed', '==', false),
    orderBy('lastWatchedAt', 'desc'),
    firestoreLimit(6),
  )
  const fallback = query(
    collection(db, 'watchHistory'),
    where('userId', '==', userId),
    where('completed', '==', false),
    firestoreLimit(20),
  )
  const snapshot = await getDocsWithFallback(primary, fallback)
  const items: Array<{ video: Video; progressSeconds: number; lastWatchedAt: string }> = []
  for (const historyDoc of snapshot.docs) {
    const historyData = historyDoc.data()
    const videoSnap = await getDoc(doc(db, 'videos', historyData.videoId))
    if (videoSnap.exists()) {
      items.push({
        video: mapVideo(videoSnap.id, videoSnap.data() as FirestoreVideoDoc),
        progressSeconds: historyData.progressSeconds,
        lastWatchedAt: (historyData.lastWatchedAt as string) || '',
      })
    }
  }
  items.sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime())
  const trimmed = items.slice(0, 6)
  const signed = await signThumbnails(trimmed.map((item) => item.video))
  return trimmed.map((item, index) => ({ video: signed[index], progressSeconds: item.progressSeconds }))
}

export type LibraryVideoItem = { video: Video; progressSeconds?: number; completed?: boolean; addedAt?: string }
export type LibraryTab = 'history' | 'later' | 'liked'

export async function fetchLibraryVideos(tab: LibraryTab): Promise<LibraryVideoItem[]> {
  if (!db || !auth?.currentUser) return []
  const userId = auth.currentUser.uid
  const collectionName = tab === 'history' ? 'watchHistory' : tab === 'later' ? 'watchLater' : 'videoLikes'
  const dateField = tab === 'history' ? 'lastWatchedAt' : tab === 'later' ? 'addedAt' : 'createdAt'
  const primary = query(
    collection(db, collectionName),
    where('userId', '==', userId),
    orderBy(dateField, 'desc'),
    firestoreLimit(100),
  )
  const fallback = query(
    collection(db, collectionName),
    where('userId', '==', userId),
    firestoreLimit(100),
  )
  const snapshot = await getDocsWithFallback(primary, fallback)
  const items: LibraryVideoItem[] = []
  for (const itemDoc of snapshot.docs) {
    const data = itemDoc.data()
    const videoSnap = await getDoc(doc(db, 'videos', data.videoId))
    if (videoSnap.exists()) {
      items.push({
        video: mapVideo(videoSnap.id, videoSnap.data() as FirestoreVideoDoc),
        ...(data.progressSeconds !== undefined ? { progressSeconds: data.progressSeconds } : {}),
        ...(data.completed !== undefined ? { completed: data.completed } : {}),
        addedAt: data.lastWatchedAt ?? data.addedAt ?? data.createdAt,
      })
    }
  }
  items.sort((a, b) => new Date(b.addedAt || '').getTime() - new Date(a.addedAt || '').getTime())
  const signed = await signThumbnails(items.map((item) => item.video))
  return items.map((item, index) => ({ ...item, video: signed[index] }))
}

export type Playlist = { id: string; name: string; description: string; visibility: 'public' | 'private'; created_at: string }

export async function fetchPlaylists(): Promise<Playlist[]> {
  if (!db || !auth?.currentUser) return []
  const userId = auth.currentUser.uid
  const primary = query(
    collection(db, 'playlists'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    firestoreLimit(100),
  )
  const fallback = query(
    collection(db, 'playlists'),
    where('userId', '==', userId),
    firestoreLimit(100),
  )
  const snapshot = await getDocsWithFallback(primary, fallback)
  const playlists = snapshot.docs.map((docSnap) => {
    const data = docSnap.data()
    return { id: docSnap.id, name: data.name, description: data.description, visibility: data.visibility, created_at: data.createdAt }
  })
  playlists.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return playlists
}

export async function createPlaylist(name: string, description: string) {
  if (!db) throw new Error('Connect Firebase to create a playlist.')
  if (!auth?.currentUser) throw new Error('Sign in to create a playlist.')
  const userId = auth.currentUser.uid
  const docRef = doc(collection(db, 'playlists'))
  const now = new Date().toISOString()
  const data = { userId, name: name.trim(), description: description.trim(), visibility: 'private' as const, createdAt: now, updatedAt: now }
  await setDoc(docRef, data)
  return { id: docRef.id, name: data.name, description: data.description, visibility: data.visibility, created_at: data.createdAt } as Playlist
}

export async function deletePlaylist(playlistId: string) {
  if (!db) throw new Error('Connect Firebase to manage playlists.')
  if (!auth?.currentUser) throw new Error('Sign in to manage playlists.')
  const pvSnapshot = await getDocs(query(collection(db, 'playlistVideos'), where('playlistId', '==', playlistId)))
  for (const pvDoc of pvSnapshot.docs) {
    await deleteDoc(pvDoc.ref)
  }
  await deleteDoc(doc(db, 'playlists', playlistId))
}

export async function fetchPlaylistVideos(playlistId: string) {
  if (!db) return []
  const primary = query(
    collection(db, 'playlistVideos'),
    where('playlistId', '==', playlistId),
    orderBy('position'),
    firestoreLimit(100),
  )
  const fallback = query(
    collection(db, 'playlistVideos'),
    where('playlistId', '==', playlistId),
    firestoreLimit(100),
  )
  const snapshot = await getDocsWithFallback(primary, fallback)
  const entries: Array<{ videoId: string; position: number }> = snapshot.docs.map((d) => {
    const data = d.data()
    return { videoId: data.videoId as string, position: Number(data.position ?? 0) }
  })
  entries.sort((a, b) => a.position - b.position)
  const videos: Video[] = []
  for (const entry of entries) {
    const videoSnap = await getDoc(doc(db, 'videos', entry.videoId))
    if (videoSnap.exists()) {
      videos.push(mapVideo(videoSnap.id, videoSnap.data() as FirestoreVideoDoc))
    }
  }
  return signThumbnails(videos)
}

export async function addToPlaylist(playlistId: string, videoId: string) {
  if (!db) throw new Error('Connect Firebase to manage playlists.')
  if (!auth?.currentUser) throw new Error('Sign in to save videos to a playlist.')
  const primary = query(collection(db, 'playlistVideos'), where('playlistId', '==', playlistId), orderBy('position', 'desc'), firestoreLimit(1))
  const fallback = query(collection(db, 'playlistVideos'), where('playlistId', '==', playlistId), firestoreLimit(100))
  const snapshot = await getDocsWithFallback(primary, fallback)
  let lastPosition = -1
  if (snapshot.docs.length > 0) {
    const positions = snapshot.docs.map((d) => Number(d.data().position) || 0)
    lastPosition = Math.max(...positions)
  }
  const docId = `${playlistId}_${videoId}`
  await setDoc(doc(db, 'playlistVideos', docId), {
    playlistId,
    videoId,
    position: lastPosition + 1,
    addedAt: new Date().toISOString(),
  })
}

export async function removeFromPlaylist(playlistId: string, videoId: string) {
  if (!db) throw new Error('Connect Firebase to manage playlists.')
  if (!auth?.currentUser) throw new Error('Sign in to manage playlists.')
  const docId = `${playlistId}_${videoId}`
  await deleteDoc(doc(db, 'playlistVideos', docId))
}

export async function removeFromLibrary(videoId: string, tab: LibraryTab) {
  if (!db) throw new Error('Connect Firebase to manage your library.')
  if (!auth?.currentUser) throw new Error('Sign in to manage your library.')
  const userId = auth.currentUser.uid
  const docId = `${userId}_${videoId}`
  const collectionName = tab === 'history' ? 'watchHistory' : tab === 'later' ? 'watchLater' : 'videoLikes'
  await deleteDoc(doc(db, collectionName, docId))
}

export type CreatorMetrics = { total_videos: number; total_views: number; published_videos: number; unpublished_videos: number; processing_videos: number; failed_videos: number }

export async function fetchCreatorMetrics(): Promise<CreatorMetrics> {
  if (!db || !auth?.currentUser) throw new Error('Connect Firebase to load creator metrics.')
  const userId = auth.currentUser.uid
  const q = query(collection(db, 'videos'), where('userId', '==', userId))
  const snapshot = await getDocs(q)
  const metrics: CreatorMetrics = { total_videos: 0, total_views: 0, published_videos: 0, unpublished_videos: 0, processing_videos: 0, failed_videos: 0 }
  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data()
    metrics.total_videos++
    metrics.total_views += Number(data.viewCount ?? 0)
    if (data.processingStatus === 'ready' && data.visibility === 'public' && data.publishedAt) {
      metrics.published_videos++
    } else if (['uploading', 'uploaded', 'processing'].includes(data.processingStatus)) {
      metrics.processing_videos++
    } else if (data.processingStatus === 'failed') {
      metrics.failed_videos++
    } else {
      metrics.unpublished_videos++
    }
  })
  return metrics
}

export async function updateVideoVisibility(videoId: string, visibility: Video['visibility']) {
  return apiRequest<{ ok: true }>(`/videos/${encodeURIComponent(videoId)}/visibility`, { method: 'POST', body: jsonBody({ visibility }) })
}

export async function deleteVideo(videoId: string) {
  return apiRequest<{ ok: true }>(`/videos/${encodeURIComponent(videoId)}`, { method: 'DELETE' })
}

export async function toggleSaved(videoId: string, table: 'watch_later' | 'video_likes') {
  if (!db) throw new Error('Connect Firebase and sign in to save videos.')
  if (!auth?.currentUser) throw new Error('Sign in to save videos to your library.')
  const userId = auth.currentUser.uid
  const collectionName = table === 'watch_later' ? 'watchLater' : 'videoLikes'
  const docId = `${userId}_${videoId}`
  const docRef = doc(db, collectionName, docId)
  const existing = await getDoc(docRef)
  if (existing.exists()) {
    await deleteDoc(docRef)
    return false
  }
  const dateField = table === 'watch_later' ? 'addedAt' : 'createdAt'
  await setDoc(docRef, {
    userId,
    videoId,
    [dateField]: new Date().toISOString(),
  })
  return true
}

export async function isSaved(videoId: string, table: 'watch_later' | 'video_likes') {
  if (!db || !auth?.currentUser) return false
  const userId = auth.currentUser.uid
  const collectionName = table === 'watch_later' ? 'watchLater' : 'videoLikes'
  const docId = `${userId}_${videoId}`
  const docSnap = await getDoc(doc(db, collectionName, docId))
  return docSnap.exists()
}

export async function saveUploadMetadata(videoId: string, input: { title: string; description: string; categoryId: string | null }) {
  if (!db) throw new Error('Connect Firebase before editing upload details.')
  await updateDoc(doc(db, 'videos', videoId), { ...input, updatedAt: new Date().toISOString() })
}

export async function createUpload(input: { title: string; description: string; categoryId: string | null; visibility: Video['visibility']; fileName: string; contentType: string; sizeBytes: number; tags: string[] }) {
  return apiRequest<{
    videoId: string
    objectKey: string
    multipart: boolean
    partSize?: number
    uploadUrl?: string
    expiresAt: string
  }>('/uploads', { method: 'POST', body: jsonBody(input) })
}
