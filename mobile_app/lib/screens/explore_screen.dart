import 'package:flutter/material.dart';

import '../state/streamx_state.dart';
import '../widgets/streamx_components.dart';
import '../widgets/video_card.dart';

class ExploreScreen extends StatefulWidget {
  const ExploreScreen({
    required this.state,
    required this.searchFocusNode,
    super.key,
  });

  final StreamXState state;
  final FocusNode searchFocusNode;

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  late final TextEditingController _searchController;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController(text: widget.state.searchQuery);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = widget.state;
    return AnimatedBuilder(
      animation: state,
      builder: (context, _) => SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(18, 10, 18, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'FIND YOUR NEXT WATCH',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: const Color(0xFFF43F49),
                fontSize: 9,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.4,
              ),
            ),
            const SizedBox(height: 7),
            Text(
              state.sortMode == 'popular' ? 'Trending now' : 'Explore videos',
              style: const TextStyle(
                fontSize: 29,
                fontWeight: FontWeight.w900,
                letterSpacing: -1,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Find a story, a place, or a point of view that stays with you.',
              style: TextStyle(
                color: Theme.of(context).textTheme.bodySmall?.color,
                fontSize: 12,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 19),
            TextField(
              controller: _searchController,
              focusNode: widget.searchFocusNode,
              onChanged: state.setSearchQuery,
              textInputAction: TextInputAction.search,
              decoration: const InputDecoration(
                hintText: 'Search titles, creators, categories…',
                prefixIcon: Icon(Icons.search_rounded),
              ),
            ),
            const SizedBox(height: 15),
            const PreviewNotice(),
            const SizedBox(height: 20),
            CategoryChips(state: state),
            const SizedBox(height: 13),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _SortChip(label: 'Newest', value: 'newest', state: state),
                  const SizedBox(width: 8),
                  _SortChip(
                    label: 'Most viewed',
                    value: 'popular',
                    state: state,
                  ),
                  const SizedBox(width: 8),
                  _SortChip(
                    label: 'Relevance',
                    value: 'relevance',
                    state: state,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 19),
            Text(
              '${state.visibleVideos.length} ${state.visibleVideos.length == 1 ? 'video' : 'videos'}',
              style: TextStyle(
                color: Theme.of(context).textTheme.bodySmall?.color,
                fontSize: 10,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 12),
            if (state.visibleVideos.isEmpty)
              EmptyStatePanel(
                title: state.searchQuery.isNotEmpty
                    ? 'No videos matched that search'
                    : 'No videos in this collection yet',
                description: state.searchQuery.isNotEmpty
                    ? 'Try a different title, creator, category, or tag.'
                    : 'New videos will show up here when creators publish them.',
                actionLabel:
                    state.searchQuery.isNotEmpty ||
                        state.selectedCategory != 'all'
                    ? 'Clear filters'
                    : null,
                onAction:
                    state.searchQuery.isNotEmpty ||
                        state.selectedCategory != 'all'
                    ? () {
                        _searchController.clear();
                        state.setSearchQuery('');
                        state.setSelectedCategory('all');
                      }
                    : null,
              )
            else
              ...state.visibleVideos.map(
                (video) => Padding(
                  padding: const EdgeInsets.only(bottom: 19),
                  child: VideoCard(
                    video: video,
                    state: state,
                    onTap: () => openVideo(context, state, video),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SortChip extends StatelessWidget {
  const _SortChip({
    required this.label,
    required this.value,
    required this.state,
  });

  final String label;
  final String value;
  final StreamXState state;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: state.sortMode == value,
      onSelected: (_) => state.setSortMode(value),
      showCheckmark: false,
      labelStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700),
      padding: const EdgeInsets.symmetric(horizontal: 8),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }
}
