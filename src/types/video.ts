export type Category = {
  id?: string
  name: string
  slug: string
}

export type Creator = {
  username?: string | null
  displayName: string
  avatarUrl?: string | null
}

export type Video = {
  id: string
  title: string
  description: string
  thumbnailKey?: string | null
  thumbnailUrl?: string
  playbackUrl?: string
  durationSeconds: number
  visibility: 'public' | 'unlisted' | 'private'
  processingStatus: string
  viewCount: number
  publishedAt?: string | null
  createdAt: string
  creator: Creator
  category?: Category | null
  isPreview?: boolean
}

export type VideoSort = 'relevance' | 'newest' | 'popular'

export type VideoSearchOptions = {
  query?: string
  category?: string
  sort?: VideoSort
  page?: number
  pageSize?: number
}

export type VideoSearchResult = {
  videos: Video[]
  preview: boolean
  hasMore: boolean
}
