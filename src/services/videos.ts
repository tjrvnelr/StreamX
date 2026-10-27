import { apiRequest, jsonBody } from '../lib/api'
import { supabase } from '../lib/supabase'
import { previewCategories, previewVideos } from '../data/preview-videos'
import type { Category, Video, VideoSearchOptions, VideoSearchResult } from '../types/video'

type CatalogRow = Record<string, unknown> & {
  id: string
  title: string
  description: string | null
  thumbnail_key: string | null
  duration_seconds: number | null
  visibility: Video['visibility']
  processing_status: string
  view_count: number | string | null
  published_at: string | null
  created_at: string
  user_id: string
}

function mapVideo(row: CatalogRow): Video {
  const creatorDisplayName = String(row.creator_display_name ?? '')
  const creator = (row.profiles ?? {}) as Record<string, unknown>
  const category = (row.categories ?? {}) as Record<string, unknown>
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    thumbnailKey: row.thumbnail_key,
    thumbnailUrl: undefined,
    durationSeconds: Number(row.duration_seconds ?? 0),
    visibility: row.visibility,
    processingStatus: row.processing_status,
    viewCount: Number(row.view_count ?? 0),
    publishedAt: row.published_at,
    createdAt: row.created_at,
    creator: {
      displayName: creatorDisplayName || String(creator.display_name ?? 'StreamX creator'),
      username: (row.creator_username as string | null) ?? (creator.username as string | null),
      avatarUrl: (row.creator_avatar_url as string | null) ?? (creator.avatar_url as string | null),
    },
    category: row.category_name
      ? { id: String(row.category_id ?? ''), name: String(row.category_name), slug: String(row.category_slug ?? '') }
      : row.categories
        ? { id: String(row.category_id ?? ''), name: String(category.name ?? ''), slug: String(category.slug ?? '') }
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
  const { query = '', category = 'all', sort = 'relevance', page = 0, pageSize = 24 } = options
  if (!supabase) {
    const normalized = query.trim().toLowerCase()
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

  const { data, error } = await supabase.rpc('search_public_videos', {
    p_query: query.trim(),
    p_category_slug: category === 'all' ? null : category,
    p_sort: sort,
    p_limit: pageSize,
    p_offset: page * pageSize,
  })
  if (error) throw new Error('We could not load videos. Please refresh and try again.')
  const rows = (data ?? []) as CatalogRow[]
  return { videos: await signThumbnails(rows.map(mapVideo)), preview: false, hasMore: rows.length === pageSize }
}

export async function fetchCategories(): Promise<{ categories: Category[]; preview: boolean }> {
  if (!supabase) return { categories: previewCategories, preview: true }
  const { data, error } = await supabase.from('categories').select('id,name,slug').order('name')
  if (error) throw new Error('Categories could not be loaded. Please refresh and try again.')
  return { categories: [{ name: 'All', slug: 'all' }, ...((data ?? []) as Category[])], preview: false }
}

export async function fetchVideo(id: string): Promise<{ video: Video | null; preview: boolean }> {
  if (!supabase) return { video: previewVideos.find((video) => video.id === id) ?? null, preview: true }
  const { data, error } = await supabase
    .from('videos')
    .select('id,user_id,title,description,thumbnail_key,category_id,duration_seconds,visibility,processing_status,view_count,published_at,created_at,profiles!videos_user_id_fkey(display_name,username,avatar_url),categories!videos_category_id_fkey(name,slug)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error('We could not load this video. Please try again.')
  return { video: data ? (await signThumbnails([mapVideo(data as unknown as CatalogRow)]))[0] : null, preview: false }
}

export async function fetchOwnerVideos(): Promise<Video[]> {
  if (!supabase) return []
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw new Error('Sign in to view your uploads.')
  const { data, error } = await supabase
    .from('videos')
    .select('id,user_id,title,description,thumbnail_key,category_id,duration_seconds,visibility,processing_status,view_count,published_at,created_at,profiles!videos_user_id_fkey(display_name,username,avatar_url),categories!videos_category_id_fkey(name,slug)')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error('Your uploads could not be loaded. Please try again.')
  return signThumbnails(((data ?? []) as unknown as CatalogRow[]).map(mapVideo))
}

export async function getPlaybackUrl(videoId: string) {
  return apiRequest<{ playbackUrl: string; expiresAt: string }>(`/videos/${encodeURIComponent(videoId)}/playback`)
}

export async function recordView(videoId: string) {
  return apiRequest<{ ok: true }>(`/videos/${encodeURIComponent(videoId)}/view`, { method: 'POST' })
}

export async function saveProgress(videoId: string, seconds: number, duration: number) {
  if (!supabase || !Number.isFinite(seconds) || seconds < 0) return
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return
  const completed = duration > 0 && seconds / duration >= 0.95
  const { error } = await supabase.from('watch_history').upsert({
    user_id: userData.user.id,
    video_id: videoId,
    progress_seconds: Math.floor(seconds),
    completed,
    last_watched_at: new Date().toISOString(),
  }, { onConflict: 'user_id,video_id' })
  if (error) throw new Error('Watch progress could not be saved.')
}

export async function fetchProgress(videoId: string) {
  if (!supabase) return null
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return null
  const { data } = await supabase.from('watch_history').select('progress_seconds,completed').eq('user_id', userData.user.id).eq('video_id', videoId).maybeSingle()
  return data
}

export async function fetchContinueWatching(): Promise<Array<{ video: Video; progressSeconds: number }>> {
  if (!supabase) return []
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return []
  const { data, error } = await supabase
    .from('watch_history')
    .select('progress_seconds,videos(id,user_id,title,description,thumbnail_key,category_id,duration_seconds,visibility,processing_status,view_count,published_at,created_at,profiles!videos_user_id_fkey(display_name,username,avatar_url),categories!videos_category_id_fkey(name,slug))')
    .eq('user_id', userData.user.id)
    .eq('completed', false)
    .order('last_watched_at', { ascending: false })
    .limit(6)
  if (error) throw new Error('Continue watching could not be loaded.')
  const items = ((data ?? []) as unknown as Array<{ progress_seconds: number; videos: CatalogRow | null }>).flatMap((row) => row.videos ? [{ video: mapVideo(row.videos), progressSeconds: row.progress_seconds }] : [])
  const signed = await signThumbnails(items.map((item) => item.video))
  return items.map((item, index) => ({ ...item, video: signed[index] }))
}

export type LibraryVideoItem = { video: Video; progressSeconds?: number; completed?: boolean; addedAt?: string }
export type LibraryTab = 'history' | 'later' | 'liked'

export async function fetchLibraryVideos(tab: LibraryTab): Promise<LibraryVideoItem[]> {
  if (!supabase) return []
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData.user) throw new Error('Sign in to open your library.')
  const relation = 'videos(id,user_id,title,description,thumbnail_key,category_id,duration_seconds,visibility,processing_status,view_count,published_at,created_at,profiles!videos_user_id_fkey(display_name,username,avatar_url),categories!videos_category_id_fkey(name,slug))'
  const table = tab === 'history' ? 'watch_history' : tab === 'later' ? 'watch_later' : 'video_likes'
  const dateColumn = tab === 'history' ? 'last_watched_at' : 'added_at'
  const selection = tab === 'history' ? `progress_seconds,completed,${dateColumn},${relation}` : `${dateColumn},${relation}`
  const { data, error } = await supabase.from(table).select(selection).eq('user_id', userData.user.id).order(dateColumn, { ascending: false }).limit(100)
  if (error) throw new Error('Your library could not be loaded. Please try again.')
  const items = ((data ?? []) as unknown as Array<{ videos: CatalogRow | null; progress_seconds?: number; completed?: boolean; last_watched_at?: string; added_at?: string }>).flatMap((row) => row.videos ? [{
    video: mapVideo(row.videos),
    ...(row.progress_seconds !== undefined ? { progressSeconds: row.progress_seconds } : {}),
    ...(row.completed !== undefined ? { completed: row.completed } : {}),
    addedAt: row.last_watched_at ?? row.added_at,
  }] : [])
  const signed = await signThumbnails(items.map((item) => item.video))
  return items.map((item, index) => ({ ...item, video: signed[index] }))
}

export type Playlist = { id: string; name: string; description: string; visibility: 'public' | 'private'; created_at: string }

export async function fetchPlaylists(): Promise<Playlist[]> {
  if (!supabase) return []
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData.user) throw new Error('Sign in to manage playlists.')
  const { data, error } = await supabase.from('playlists').select('id,name,description,visibility,created_at').eq('user_id', userData.user.id).order('created_at', { ascending: false }).limit(100)
  if (error) throw new Error('Playlists could not be loaded.')
  return (data ?? []) as Playlist[]
}

export async function createPlaylist(name: string, description: string) {
  if (!supabase) throw new Error('Connect Supabase to create a playlist.')
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData.user) throw new Error('Sign in to create a playlist.')
  const { data, error } = await supabase.from('playlists').insert({ user_id: userData.user.id, name: name.trim(), description: description.trim(), visibility: 'private' }).select('id,name,description,visibility,created_at').single()
  if (error || !data) throw new Error('Playlist could not be created. Check that the name is unique and try again.')
  return data as Playlist
}

export async function deletePlaylist(playlistId: string) {
  if (!supabase) throw new Error('Connect Supabase to manage playlists.')
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData.user) throw new Error('Sign in to manage playlists.')
  const { error } = await supabase.from('playlists').delete().eq('id', playlistId).eq('user_id', userData.user.id)
  if (error) throw new Error('Playlist could not be deleted.')
}

export async function fetchPlaylistVideos(playlistId: string) {
  if (!supabase) return []
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData.user) throw new Error('Sign in to open your playlists.')
  const relation = 'videos(id,user_id,title,description,thumbnail_key,category_id,duration_seconds,visibility,processing_status,view_count,published_at,created_at,profiles!videos_user_id_fkey(display_name,username,avatar_url),categories!videos_category_id_fkey(name,slug))'
  const { data, error } = await supabase.from('playlist_videos').select(`position,added_at,${relation}`).eq('playlist_id', playlistId).order('position').limit(100)
  if (error) throw new Error('Playlist videos could not be loaded.')
  const videos = ((data ?? []) as unknown as Array<{ position: number; added_at: string; videos: CatalogRow | null }>).flatMap((row) => row.videos ? [mapVideo(row.videos)] : [])
  return signThumbnails(videos)
}

export async function addToPlaylist(playlistId: string, videoId: string) {
  if (!supabase) throw new Error('Connect Supabase to manage playlists.')
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData.user) throw new Error('Sign in to save videos to a playlist.')
  const { data: last } = await supabase.from('playlist_videos').select('position').eq('playlist_id', playlistId).order('position', { ascending: false }).limit(1).maybeSingle()
  const { error } = await supabase.from('playlist_videos').insert({ playlist_id: playlistId, video_id: videoId, position: (last?.position ?? -1) + 1 })
  if (error) throw new Error('This video could not be added to the playlist.')
}

export async function removeFromPlaylist(playlistId: string, videoId: string) {
  if (!supabase) throw new Error('Connect Supabase to manage playlists.')
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData.user) throw new Error('Sign in to manage playlists.')
  const { error } = await supabase.from('playlist_videos').delete().eq('playlist_id', playlistId).eq('video_id', videoId)
  if (error) throw new Error('This video could not be removed from the playlist.')
}

export async function removeFromLibrary(videoId: string, tab: LibraryTab) {
  if (!supabase) throw new Error('Connect Supabase to manage your library.')
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData.user) throw new Error('Sign in to manage your library.')
  const table = tab === 'history' ? 'watch_history' : tab === 'later' ? 'watch_later' : 'video_likes'
  const { error } = await supabase.from(table).delete().eq('user_id', userData.user.id).eq('video_id', videoId)
  if (error) throw new Error('This item could not be removed. Please try again.')
}

export type CreatorMetrics = { total_videos: number; total_views: number; published_videos: number; unpublished_videos: number; processing_videos: number; failed_videos: number }

export async function fetchCreatorMetrics(): Promise<CreatorMetrics> {
  if (!supabase) throw new Error('Connect Supabase to load creator metrics.')
  const { data, error } = await supabase.rpc('creator_dashboard_metrics').single()
  if (error) throw new Error('Creator metrics could not be loaded.')
  return data as CreatorMetrics
}

export async function updateVideoVisibility(videoId: string, visibility: Video['visibility']) {
  return apiRequest<{ ok: true }>(`/videos/${encodeURIComponent(videoId)}/visibility`, { method: 'POST', body: jsonBody({ visibility }) })
}

export async function deleteVideo(videoId: string) {
  return apiRequest<{ ok: true }>(`/videos/${encodeURIComponent(videoId)}`, { method: 'DELETE' })
}

export async function toggleSaved(videoId: string, table: 'watch_later' | 'video_likes') {
  if (!supabase) throw new Error('Connect Supabase and sign in to save videos.')
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData.user) throw new Error('Sign in to save videos to your library.')
  const userId = userData.user.id
  const { data: existing, error: lookupError } = await supabase.from(table).select('id').eq('user_id', userId).eq('video_id', videoId).maybeSingle()
  if (lookupError) throw new Error('Your library could not be updated. Please try again.')
  if (existing) {
    const { error } = await supabase.from(table).delete().eq('id', existing.id)
    if (error) throw new Error('Your library could not be updated. Please try again.')
    return false
  }
  const { error } = await supabase.from(table).insert({ user_id: userId, video_id: videoId })
  if (error) throw new Error('Your library could not be updated. Please try again.')
  return true
}

export async function isSaved(videoId: string, table: 'watch_later' | 'video_likes') {
  if (!supabase) return false
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return false
  const { data, error } = await supabase.from(table).select('id').eq('user_id', userData.user.id).eq('video_id', videoId).maybeSingle()
  if (error) return false
  return Boolean(data)
}

export async function saveUploadMetadata(videoId: string, input: { title: string; description: string; categoryId: string | null }) {
  if (!supabase) throw new Error('Connect Supabase before editing upload details.')
  const { error } = await supabase.from('videos').update(input).eq('id', videoId)
  if (error) throw new Error('Video details could not be saved.')
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
