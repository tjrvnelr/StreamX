import { describe, expect, it } from 'vitest'
import { previewVideos } from '../data/preview-videos'
import { fetchCatalog, formatAge, formatDuration, formatViews } from './videos'

describe('video formatting', () => {
  it('formats durations with hours when needed', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(762)).toBe('12:42')
    expect(formatDuration(3661)).toBe('1:01:01')
  })

  it('formats view counts without implying more precision than stored', () => {
    expect(formatViews(950)).toBe('950 views')
    expect(formatViews(18400)).toBe('18.4K views')
    expect(formatViews(1_000_000)).toBe('1M views')
  })

  it('formats recent upload dates', () => {
    expect(formatAge(new Date(Date.now() - 2 * 86_400_000).toISOString())).toBe('2 days ago')
  })
})

describe('preview catalog', () => {
  it('labels preview data and applies category and query filters', async () => {
    const travel = await fetchCatalog({ category: 'travel' })
    expect(travel.preview).toBe(true)
    expect(travel.videos.length).toBeGreaterThan(0)
    expect(travel.videos.every((video) => video.category?.slug === 'travel')).toBe(true)

    const match = await fetchCatalog({ query: 'last train' })
    expect(match.videos.map((video) => video.title)).toContain('Tokyo after the last train')
    expect(previewVideos.every((video) => video.isPreview)).toBe(true)
  })
})
