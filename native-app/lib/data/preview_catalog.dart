import '../models/streamx_video.dart';

const previewCategories = <StreamXCategory>[
  StreamXCategory(name: 'All', slug: 'all'),
  StreamXCategory(name: 'Documentary', slug: 'documentary'),
  StreamXCategory(name: 'Travel', slug: 'travel'),
  StreamXCategory(name: 'Nature', slug: 'nature'),
  StreamXCategory(name: 'Design', slug: 'design'),
  StreamXCategory(name: 'Music', slug: 'music'),
  StreamXCategory(name: 'Short films', slug: 'short-films'),
];

const _travel = StreamXCategory(name: 'Travel', slug: 'travel');
const _documentary = StreamXCategory(name: 'Documentary', slug: 'documentary');
const _nature = StreamXCategory(name: 'Nature', slug: 'nature');
const _design = StreamXCategory(name: 'Design', slug: 'design');
const _shortFilms = StreamXCategory(name: 'Short films', slug: 'short-films');
const _samplePlayback =
    'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

final _now = DateTime.now();

final previewVideos = <StreamXVideo>[
  StreamXVideo(
    id: 'preview-quiet-coast',
    title: 'The quiet coast of Lofoten',
    description: 'A slow journey across the northern islands, filmed in the blue hour before the village wakes. Take a little space, settle in, and watch the day arrive.',
    creator: 'Mira Sol',
    category: _travel,
    thumbnailUrl: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1100&q=85',
    durationSeconds: 762,
    viewCount: 18400,
    createdAt: _now.subtract(const Duration(days: 2)),
    playbackUrl: _samplePlayback,
    isPreview: true,
  ),
  StreamXVideo(
    id: 'preview-high-country',
    title: 'Where the trail ends',
    description: 'A small crew follows one mountain guide through the last light of the season.',
    creator: 'Field Notes Studio',
    category: _documentary,
    thumbnailUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=82',
    durationSeconds: 1124,
    viewCount: 32700,
    createdAt: _now.subtract(const Duration(days: 1)),
    playbackUrl: _samplePlayback,
    isPreview: true,
  ),
  StreamXVideo(
    id: 'preview-still-water',
    title: 'A lake, before sunrise',
    description: 'A field recording and a quiet morning on the water.',
    creator: 'Elliot Park',
    category: _nature,
    thumbnailUrl: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=82',
    durationSeconds: 518,
    viewCount: 8920,
    createdAt: _now.subtract(const Duration(days: 4)),
    playbackUrl: _samplePlayback,
    isPreview: true,
  ),
  StreamXVideo(
    id: 'preview-green-world',
    title: 'Learning to look slowly',
    description:
        'A visual essay about the ordinary landscapes we pass every day.',
    creator: 'Common Ground',
    category: _nature,
    thumbnailUrl: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=900&q=82',
    durationSeconds: 924,
    viewCount: 25100,
    createdAt: _now.subtract(const Duration(days: 7)),
    playbackUrl: _samplePlayback,
    isPreview: true,
  ),
  StreamXVideo(
    id: 'preview-night-walk',
    title: 'Tokyo after the last train',
    description: 'A night walk through the city, from its bright avenues to the quiet side streets.',
    creator: 'Kei Tanaka',
    category: _travel,
    thumbnailUrl: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=82',
    durationSeconds: 1438,
    viewCount: 41600,
    createdAt: _now.subtract(const Duration(days: 3)),
    playbackUrl: _samplePlayback,
    isPreview: true,
  ),
  StreamXVideo(
    id: 'preview-forest-room',
    title: 'The forest has its own time',
    description: 'A short portrait of one forest through a changing day.',
    creator: 'Northbound',
    category: _shortFilms,
    thumbnailUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=82',
    durationSeconds: 687,
    viewCount: 13900,
    createdAt: _now.subtract(const Duration(days: 5)),
    playbackUrl: _samplePlayback,
    isPreview: true,
  ),
  StreamXVideo(
    id: 'preview-sand-lines',
    title: 'Lines in the sand',
    description:
        'Light, form, and the shifting geometry of a desert afternoon.',
    creator: 'Studio Elsewhere',
    category: _design,
    thumbnailUrl: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=900&q=82',
    durationSeconds: 808,
    viewCount: 11700,
    createdAt: _now.subtract(const Duration(days: 14)),
    playbackUrl: _samplePlayback,
    isPreview: true,
  ),
];

StreamXVideo get previewFeatured => previewVideos.first;
