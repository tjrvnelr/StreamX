import 'package:flutter/material.dart';

import '../data/preview_catalog.dart';
import '../models/streamx_video.dart';
import '../state/streamx_state.dart';
import '../theme/streamx_theme.dart';
import '../widgets/streamx_components.dart';
import '../widgets/video_card.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({required this.state, super.key});

  final StreamXState state;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: state,
      builder: (context, _) {
        final recommended = state.homeVideos;
        final featured = recommended.isNotEmpty
            ? recommended.first
            : previewFeatured;
        return SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const PreviewNotice(),
              const SizedBox(height: 20),
              _FeaturedHero(video: featured, state: state),
              const SizedBox(height: 23),
              CategoryChips(state: state),
              if (state.historyVideos.isNotEmpty) ...[
                const SizedBox(height: 27),
                SectionHeading(
                  eyebrow: 'Pick up where you left off',
                  title: 'Continue watching',
                  onAction: () {
                    state.setLibraryTab('history');
                    state.setCurrentTab(2);
                  },
                ),
                const SizedBox(height: 13),
                _HorizontalVideoList(videos: state.historyVideos, state: state),
              ],
              const SizedBox(height: 27),
              SectionHeading(
                eyebrow: 'A good place to start',
                title: state.selectedCategory == 'all'
                    ? 'Picked for you'
                    : 'Explore ${_categoryName(state.selectedCategory)}',
                onAction: () => state.setCurrentTab(1),
              ),
              const SizedBox(height: 13),
              if (recommended.isEmpty)
                const EmptyStatePanel(
                  title: 'Nothing here just yet',
                  description:
                      'Try another category or search the full catalog.',
                )
              else
                _HorizontalVideoList(
                  videos: recommended.take(5).toList(),
                  state: state,
                ),
              const SizedBox(height: 28),
              SectionHeading(
                eyebrow: 'People are watching',
                title: 'Trending now',
                onAction: () {
                  state.setSelectedCategory('all');
                  state.setSortMode('popular');
                  state.setCurrentTab(1);
                },
              ),
              const SizedBox(height: 13),
              _HorizontalVideoList(
                videos: state.trendingVideos.take(4).toList(),
                state: state,
              ),
              const SizedBox(height: 28),
              SectionHeading(
                eyebrow: 'Just landed',
                title: 'Freshly uploaded',
                onAction: () {
                  state.setSelectedCategory('all');
                  state.setSortMode('newest');
                  state.setCurrentTab(1);
                },
              ),
              const SizedBox(height: 13),
              ...state.recentVideos
                  .take(3)
                  .map(
                    (video) => Padding(
                      padding: const EdgeInsets.only(bottom: 18),
                      child: VideoCard(
                        video: video,
                        state: state,
                        onTap: () => openVideo(context, state, video),
                      ),
                    ),
                  ),
            ],
          ),
        );
      },
    );
  }

  String _categoryName(String slug) {
    for (final category in previewCategories) {
      if (category.slug == slug) return category.name;
    }
    return 'videos';
  }
}

class _FeaturedHero extends StatelessWidget {
  const _FeaturedHero({required this.video, required this.state});

  final StreamXVideo video;
  final StreamXState state;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(28),
      child: SizedBox(
        height: 390,
        width: double.infinity,
        child: Stack(
          fit: StackFit.expand,
          children: [
            VideoArtwork(imageUrl: video.thumbnailUrl),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [
                    Color(0xEE0A0C10),
                    Color(0x960A0C10),
                    Color(0x210A0C10),
                  ],
                  stops: [0, .68, 1],
                ),
              ),
            ),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [Color(0xAA0A0C10), Colors.transparent],
                ),
              ),
            ),
            Positioned(
              left: 21,
              right: 18,
              bottom: 22,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 7,
                    runSpacing: 7,
                    children: [
                      _HeroBadge(
                        icon: Icons.auto_awesome_rounded,
                        label: 'Featured for you',
                      ),
                      _HeroBadge(label: video.category.name),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    video.title,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 31,
                      height: 1.04,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -1.2,
                    ),
                  ),
                  const SizedBox(height: 9),
                  Text(
                    video.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: .78),
                      fontSize: 11.5,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${video.creator}  ·  ${formatViews(video.viewCount)}  ·  ${formatDuration(video.durationSeconds)}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: .68),
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: () => openVideo(context, state, video),
                    icon: const Icon(Icons.play_arrow_rounded, size: 20),
                    label: const Text('Watch now'),
                    style: FilledButton.styleFrom(
                      backgroundColor: StreamXColors.brand,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 12,
                      ),
                      textStyle: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(15),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Positioned(
              right: 14,
              bottom: 14,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: .55),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: .12),
                  ),
                ),
                child: Text(
                  formatDuration(video.durationSeconds),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroBadge extends StatelessWidget {
  const _HeroBadge({required this.label, this.icon});

  final String label;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: .3),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withValues(alpha: .16)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: StreamXColors.brand),
            const SizedBox(width: 5),
          ],
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 9,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _HorizontalVideoList extends StatelessWidget {
  const _HorizontalVideoList({required this.videos, required this.state});

  final List<StreamXVideo> videos;
  final StreamXState state;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 230,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: videos.length,
        separatorBuilder: (_, _) => const SizedBox(width: 14),
        itemBuilder: (context, index) {
          final video = videos[index];
          return VideoCard(
            video: video,
            state: state,
            horizontal: true,
            onTap: () => openVideo(context, state, video),
          );
        },
      ),
    );
  }
}
