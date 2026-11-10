import 'package:flutter/material.dart';

import '../models/streamx_video.dart';
import '../state/streamx_state.dart';
import '../theme/streamx_theme.dart';

class VideoArtwork extends StatelessWidget {
  const VideoArtwork({required this.imageUrl, super.key});

  final String imageUrl;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Stack(
      fit: StackFit.expand,
      children: [
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                colors.primary.withValues(alpha: .26),
                const Color(0xFF253643),
                const Color(0xFF171B25),
              ],
            ),
          ),
          child: Icon(
            Icons.movie_creation_outlined,
            color: Colors.white.withValues(alpha: .20),
            size: 34,
          ),
        ),
        Image.network(
          imageUrl,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) => const SizedBox.expand(),
        ),
      ],
    );
  }
}

class VideoCard extends StatelessWidget {
  const VideoCard({
    required this.video,
    required this.state,
    required this.onTap,
    this.compact = false,
    this.horizontal = false,
    super.key,
  });

  final StreamXVideo video;
  final StreamXState state;
  final VoidCallback onTap;
  final bool compact;
  final bool horizontal;

  @override
  Widget build(BuildContext context) {
    if (compact) return _buildCompact(context);
    return horizontal ? _buildHorizontal(context) : _buildVertical(context);
  }

  Widget _thumbnail(BuildContext context) {
    final progress = state.progressPercentFor(video);
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(19),
        child: Stack(
          fit: StackFit.expand,
          children: [
            VideoArtwork(imageUrl: video.thumbnailUrl),
            Positioned(
              right: 9,
              bottom: 9,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: .78),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  formatDuration(video.durationSeconds),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
              ),
            ),
            Positioned(
              left: 9,
              top: 9,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: .66),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'PREVIEW',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 8,
                    letterSpacing: 1,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
            if (progress != null)
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: LinearProgressIndicator(
                  value: progress / 100,
                  minHeight: 3,
                  backgroundColor: Colors.white.withValues(alpha: .35),
                  valueColor: const AlwaysStoppedAnimation(StreamXColors.brand),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildVertical(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(onTap: onTap, child: _thumbnail(context)),
        const SizedBox(height: 10),
        _details(context),
      ],
    );
  }

  Widget _buildHorizontal(BuildContext context) {
    return SizedBox(
      width: 252,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(onTap: onTap, child: _thumbnail(context)),
          const SizedBox(height: 10),
          _details(context),
        ],
      ),
    );
  }

  Widget _buildCompact(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 145,
          child: GestureDetector(onTap: onTap, child: _thumbnail(context)),
        ),
        const SizedBox(width: 12),
        Expanded(child: _details(context, compact: true)),
      ],
    );
  }

  Widget _details(BuildContext context, {bool compact = false}) {
    final theme = Theme.of(context);
    final ink = theme.colorScheme.onSurface;
    final muted = theme.textTheme.bodySmall?.color;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CircleAvatar(
          radius: 18,
          backgroundColor: StreamXColors.brand.withValues(alpha: .12),
          child: Text(
            _initials(video.creator),
            style: const TextStyle(
              color: StreamXColors.brand,
              fontSize: 9,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: GestureDetector(
            onTap: onTap,
            behavior: HitTestBehavior.opaque,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  video.title,
                  maxLines: compact ? 2 : 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: ink,
                    fontSize: 13,
                    height: 1.35,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -.25,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  video.creator,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: muted,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  '${formatViews(video.viewCount)}  ·  ${formatAge(video.createdAt)}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: muted?.withValues(alpha: .82),
                    fontSize: 9.5,
                  ),
                ),
              ],
            ),
          ),
        ),
        if (!compact)
          SizedBox(
            width: 34,
            height: 34,
            child: IconButton(
              tooltip: state.isSaved(video.id)
                  ? 'Remove from Watch later'
                  : 'Save to Watch later',
              visualDensity: VisualDensity.compact,
              padding: EdgeInsets.zero,
              onPressed: () => state.toggleWatchLater(video.id),
              icon: Icon(
                state.isSaved(video.id)
                    ? Icons.bookmark_rounded
                    : Icons.bookmark_border_rounded,
                size: 19,
                color: state.isSaved(video.id) ? StreamXColors.brand : muted,
              ),
            ),
          ),
      ],
    );
  }

  String _initials(String name) {
    final parts = name
        .split(RegExp(r'[\s._-]+'))
        .where((part) => part.isNotEmpty)
        .take(2);
    return parts.map((part) => part[0].toUpperCase()).join();
  }
}

class PreviewNotice extends StatelessWidget {
  const PreviewNotice({super.key});

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).textTheme.bodySmall?.color;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 11),
      decoration: BoxDecoration(
        color: StreamXColors.brand.withValues(alpha: .065),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: StreamXColors.brand.withValues(alpha: .2)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.auto_awesome_rounded,
            color: StreamXColors.brand,
            size: 16,
          ),
          const SizedBox(width: 9),
          Expanded(
            child: Text.rich(
              TextSpan(
                style: TextStyle(color: muted, fontSize: 10.5, height: 1.55),
                children: const [
                  TextSpan(
                    text: 'Preview mode. ',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                  TextSpan(
                    text: 'Sample titles and counts are illustrative; connect Firebase to browse the live catalog.',
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
