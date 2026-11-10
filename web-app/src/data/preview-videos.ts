import type { Category, Video } from '../types/video'

export const previewCategories: Category[] = [
  { name: 'All', slug: 'all' },
  { name: 'Documentary', slug: 'documentary' },
  { name: 'Travel', slug: 'travel' },
  { name: 'Nature', slug: 'nature' },
  { name: 'Design', slug: 'design' },
  { name: 'Music', slug: 'music' },
  { name: 'Short films', slug: 'short-films' },
]

const images = {
  coast: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1100&q=85',
  mountain: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=82',
  lake: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=82',
  field: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=900&q=82',
  city: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=82',
  forest: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=82',
  desert: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=900&q=82',
}

function previewVideo(
  id: string,
  title: string,
  creator: string,
  category: Category,
  thumbnailUrl: string,
  durationSeconds: number,
  viewCount: number,
  age: string,
  description: string,
): Video {
  return {
    id,
    title,
    description,
    thumbnailUrl,
    durationSeconds,
    visibility: 'public',
    processingStatus: 'ready',
    viewCount,
    createdAt: new Date(Date.now() - ageMs(age)).toISOString(),
    publishedAt: new Date(Date.now() - ageMs(age)).toISOString(),
    creator: { displayName: creator, username: creator.toLowerCase().replaceAll(' ', '') },
    category,
    isPreview: true,
    playbackUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  }
}

function ageMs(age: string) {
  const match = age.match(/(\d+)\s*(h|d|w)/i)
  if (!match) return 0
  const value = Number(match[1])
  const unit = match[2].toLowerCase()
  return value * (unit === 'h' ? 3_600_000 : unit === 'd' ? 86_400_000 : 604_800_000)
}

const travel = { name: 'Travel', slug: 'travel' }
const documentary = { name: 'Documentary', slug: 'documentary' }
const nature = { name: 'Nature', slug: 'nature' }
const design = { name: 'Design', slug: 'design' }
const shortFilms = { name: 'Short films', slug: 'short-films' }

export const previewVideos: Video[] = [
  previewVideo('preview-quiet-coast', 'The quiet coast of Lofoten', 'Mira Sol', travel, images.coast, 762, 18400, '2d', 'A slow journey across the northern islands, filmed in the blue hour before the village wakes.'),
  previewVideo('preview-high-country', 'Where the trail ends', 'Field Notes Studio', documentary, images.mountain, 1124, 32700, '1d', 'A small crew follows one mountain guide through the last light of the season.'),
  previewVideo('preview-still-water', 'A lake, before sunrise', 'Elliot Park', nature, images.lake, 518, 8920, '4d', 'A field recording and a quiet morning on the water.'),
  previewVideo('preview-green-world', 'Learning to look slowly', 'Common Ground', nature, images.field, 924, 25100, '1w', 'A visual essay about the ordinary landscapes we pass every day.'),
  previewVideo('preview-night-walk', 'Tokyo after the last train', 'Kei Tanaka', travel, images.city, 1438, 41600, '3d', 'A night walk through the city, from its bright avenues to the quiet side streets.'),
  previewVideo('preview-forest-room', 'The forest has its own time', 'Northbound', shortFilms, images.forest, 687, 13900, '5d', 'A short portrait of one forest through a changing day.'),
  previewVideo('preview-sand-lines', 'Lines in the sand', 'Studio Elsewhere', design, images.desert, 808, 11700, '2w', 'Light, form, and the shifting geometry of a desert afternoon.'),
]

export const previewFeatured = previewVideo(
  'preview-quiet-coast',
  'The quiet coast of Lofoten',
  'Mira Sol',
  travel,
  images.coast,
  762,
  18400,
  '2d',
  'A slow journey across the northern islands, filmed in the blue hour before the village wakes. Take a little space, settle in, and watch the day arrive.',
)
