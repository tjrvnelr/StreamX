import 'package:flutter/material.dart';

import '../models/streamx_video.dart';
import '../screens/watch_screen.dart';
import '../state/streamx_state.dart';
import '../theme/streamx_theme.dart';

void openVideo(BuildContext context, StreamXState state, StreamXVideo video) {
  Navigator.of(context).push<void>(
    MaterialPageRoute<void>(
      builder: (_) => WatchScreen(video: video, state: state),
    ),
  );
}

class SectionHeading extends StatelessWidget {
  const SectionHeading({
    required this.title,
    this.eyebrow,
    this.actionLabel = 'See all',
    this.onAction,
    super.key,
  });

  final String title;
  final String? eyebrow;
  final String actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).textTheme.bodySmall?.color;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (eyebrow != null) ...[
                Text(
                  eyebrow!.toUpperCase(),
                  style: const TextStyle(
                    color: StreamXColors.brand,
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.4,
                  ),
                ),
                const SizedBox(height: 5),
              ],
              Text(
                title,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontSize: 19,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -.55,
                ),
              ),
            ],
          ),
        ),
        if (onAction != null)
          TextButton.icon(
            onPressed: onAction,
            iconAlignment: IconAlignment.end,
            icon: const Icon(Icons.arrow_forward_rounded, size: 15),
            label: Text(
              actionLabel,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
            ),
            style: TextButton.styleFrom(
              foregroundColor: muted,
              padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 4),
              visualDensity: VisualDensity.compact,
            ),
          ),
      ],
    );
  }
}

class CategoryChips extends StatelessWidget {
  const CategoryChips({required this.state, super.key});

  final StreamXState state;

  @override
  Widget build(BuildContext context) {
    final line = Theme.of(context).dividerColor;
    final muted = Theme.of(context).textTheme.bodySmall?.color;
    return SizedBox(
      height: 38,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: const [
          'All',
          'Documentary',
          'Travel',
          'Nature',
          'Design',
          'Music',
          'Short films',
        ].length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          const categories = [
            StreamXCategory(name: 'All', slug: 'all'),
            StreamXCategory(name: 'Documentary', slug: 'documentary'),
            StreamXCategory(name: 'Travel', slug: 'travel'),
            StreamXCategory(name: 'Nature', slug: 'nature'),
            StreamXCategory(name: 'Design', slug: 'design'),
            StreamXCategory(name: 'Music', slug: 'music'),
            StreamXCategory(name: 'Short films', slug: 'short-films'),
          ];
          final category = categories[index];
          final selected = category.slug == state.selectedCategory;
          return ChoiceChip(
            label: Text(category.name),
            selected: selected,
            onSelected: (_) => state.setSelectedCategory(category.slug),
            showCheckmark: false,
            labelStyle: TextStyle(
              color: selected ? Colors.white : muted,
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
            ),
            backgroundColor: Theme.of(context).colorScheme.surface,
            selectedColor: StreamXColors.brand,
            side: BorderSide(color: selected ? StreamXColors.brand : line),
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 0),
            shape: const StadiumBorder(),
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          );
        },
      ),
    );
  }
}

class EmptyStatePanel extends StatelessWidget {
  const EmptyStatePanel({
    required this.title,
    required this.description,
    this.icon = Icons.movie_filter_outlined,
    this.actionLabel,
    this.onAction,
    super.key,
  });

  final String title;
  final String description;
  final IconData icon;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 32, 24, 28),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(25),
        border: Border.all(color: theme.dividerColor.withValues(alpha: .75)),
      ),
      child: Column(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: StreamXColors.brand.withValues(alpha: .1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: StreamXColors.brand, size: 23),
          ),
          const SizedBox(height: 14),
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: theme.colorScheme.onSurface,
              fontSize: 17,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            description,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: theme.textTheme.bodySmall?.color,
              fontSize: 12,
              height: 1.55,
            ),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: onAction,
              icon: const Icon(Icons.explore_outlined, size: 17),
              label: Text(actionLabel!),
              style: FilledButton.styleFrom(
                backgroundColor: StreamXColors.brand,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 17,
                  vertical: 12,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
