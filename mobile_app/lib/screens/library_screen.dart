import 'package:flutter/material.dart';

import '../models/streamx_video.dart';
import '../state/streamx_state.dart';
import '../theme/streamx_theme.dart';
import '../widgets/streamx_components.dart';
import '../widgets/video_card.dart';

class LibraryScreen extends StatelessWidget {
  const LibraryScreen({required this.state, super.key});

  final StreamXState state;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: state,
      builder: (context, _) {
        final selectedPlaylist = state.playlists
            .where((item) => item.id == state.selectedPlaylistId)
            .firstOrNull;
        final title = state.libraryTab == 'playlists'
            ? selectedPlaylist?.name ?? 'Your playlists'
            : switch (state.libraryTab) {
                'later' => 'Watch later',
                'liked' => 'Liked videos',
                _ => 'History',
              };
        return SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'YOUR SPACE',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: StreamXColors.brand,
                  fontSize: 9,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.4,
                ),
              ),
              const SizedBox(height: 7),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 29,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -1,
                      ),
                    ),
                  ),
                  if (state.libraryTab == 'playlists' &&
                      state.selectedPlaylistId != null)
                    IconButton(
                      tooltip: 'All playlists',
                      onPressed: () => state.selectPlaylist(null),
                      icon: const Icon(Icons.arrow_back_rounded),
                    ),
                  if (state.libraryTab == 'playlists' &&
                      state.selectedPlaylistId == null)
                    IconButton.filled(
                      tooltip: 'Create playlist',
                      onPressed: () => _createPlaylist(context),
                      style: IconButton.styleFrom(
                        backgroundColor: StreamXColors.brand,
                        foregroundColor: Colors.white,
                      ),
                      icon: const Icon(Icons.add_rounded),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'A personal place for everything you want to revisit.',
                style: TextStyle(
                  color: Theme.of(context).textTheme.bodySmall?.color,
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 18),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _LibraryTabChip(
                      label: 'History',
                      icon: Icons.history_rounded,
                      value: 'history',
                      state: state,
                    ),
                    const SizedBox(width: 7),
                    _LibraryTabChip(
                      label: 'Watch later',
                      icon: Icons.bookmark_border_rounded,
                      value: 'later',
                      state: state,
                    ),
                    const SizedBox(width: 7),
                    _LibraryTabChip(
                      label: 'Liked',
                      icon: Icons.favorite_border_rounded,
                      value: 'liked',
                      state: state,
                    ),
                    const SizedBox(width: 7),
                    _LibraryTabChip(
                      label: 'Playlists',
                      icon: Icons.playlist_play_rounded,
                      value: 'playlists',
                      state: state,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 19),
              if (state.libraryTab == 'playlists')
                _PlaylistContent(state: state)
              else
                _VideoLibraryContent(
                  state: state,
                  videos: switch (state.libraryTab) {
                    'later' => state.watchLaterVideos,
                    'liked' => state.likedVideos,
                    _ => state.historyVideos,
                  },
                ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _createPlaylist(BuildContext context) async {
    final controller = TextEditingController();
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('New playlist'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLength: 100,
          textCapitalization: TextCapitalization.sentences,
          decoration: const InputDecoration(
            hintText: 'Weekend watches',
            labelText: 'Name',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final name = controller.text.trim();
              if (name.isEmpty) return;
              state.createPlaylist(name);
              Navigator.pop(dialogContext);
            },
            style: FilledButton.styleFrom(backgroundColor: StreamXColors.brand),
            child: const Text('Create'),
          ),
        ],
      ),
    );
    controller.dispose();
  }
}

class _LibraryTabChip extends StatelessWidget {
  const _LibraryTabChip({
    required this.label,
    required this.icon,
    required this.value,
    required this.state,
  });

  final String label;
  final IconData icon;
  final String value;
  final StreamXState state;

  @override
  Widget build(BuildContext context) {
    final selected = state.libraryTab == value;
    final muted = Theme.of(context).textTheme.bodySmall?.color;
    return ChoiceChip(
      selected: selected,
      showCheckmark: false,
      onSelected: (_) => state.setLibraryTab(value),
      avatar: Icon(
        icon,
        size: 15,
        color: selected ? StreamXColors.brand : muted,
      ),
      label: Text(label),
      labelStyle: TextStyle(
        color: selected ? StreamXColors.brand : muted,
        fontSize: 10,
        fontWeight: FontWeight.w700,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 8),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }
}

class _VideoLibraryContent extends StatelessWidget {
  const _VideoLibraryContent({required this.state, required this.videos});

  final StreamXState state;
  final List<StreamXVideo> videos;

  @override
  Widget build(BuildContext context) {
    final description = switch (state.libraryTab) {
      'later' => 'Save a video to come back to it when you have time.',
      'liked' => 'Tap Like on a video to keep it in this collection.',
      _ => 'Videos you play will be saved here so you can pick up where you left off.',
    };
    final title = switch (state.libraryTab) {
      'later' => 'Your Watch later list is clear',
      'liked' => 'No liked videos yet',
      _ => 'Nothing watched yet',
    };
    if (videos.isEmpty) {
      return EmptyStatePanel(
        title: title,
        description: description,
        actionLabel: 'Explore videos',
        onAction: () => state.setCurrentTab(1),
      );
    }

    return Column(
      children: videos
          .map(
            (video) => Padding(
              padding: const EdgeInsets.only(bottom: 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  VideoCard(
                    video: video,
                    state: state,
                    onTap: () => openVideo(context, state, video),
                  ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      onPressed: () => state.removeFromLibrary(video.id),
                      icon: const Icon(
                        Icons.remove_circle_outline_rounded,
                        size: 15,
                      ),
                      label: Text(
                        'Remove from ${state.libraryTab == 'later'
                            ? 'Watch later'
                            : state.libraryTab == 'liked'
                            ? 'liked videos'
                            : 'history'}',
                      ),
                      style: TextButton.styleFrom(
                        foregroundColor: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.color,
                        visualDensity: VisualDensity.compact,
                        textStyle: const TextStyle(fontSize: 10),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          )
          .toList(),
    );
  }
}

class _PlaylistContent extends StatelessWidget {
  const _PlaylistContent({required this.state});

  final StreamXState state;

  @override
  Widget build(BuildContext context) {
    final selectedId = state.selectedPlaylistId;
    if (selectedId != null) {
      final playlist = state.playlists
          .where((item) => item.id == selectedId)
          .firstOrNull;
      final videos = state.selectedPlaylistVideos;
      return Column(
        children: [
          if (playlist != null)
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () => state.deletePlaylist(playlist.id),
                icon: const Icon(Icons.delete_outline_rounded, size: 16),
                label: const Text('Delete playlist'),
              ),
            ),
          if (videos.isEmpty)
            const EmptyStatePanel(
              title: 'This playlist is empty',
              description: 'Open a video and add it to this playlist when you find something you like.',
            )
          else
            ...videos.map(
              (video) => Padding(
                padding: const EdgeInsets.only(bottom: 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    VideoCard(
                      video: video,
                      state: state,
                      onTap: () => openVideo(context, state, video),
                    ),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton.icon(
                        onPressed: () =>
                            state.removeFromPlaylist(selectedId, video.id),
                        icon: const Icon(
                          Icons.remove_circle_outline_rounded,
                          size: 15,
                        ),
                        label: const Text('Remove from playlist'),
                        style: TextButton.styleFrom(
                          visualDensity: VisualDensity.compact,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      );
    }

    if (state.playlists.isEmpty) {
      return EmptyStatePanel(
        title: 'No playlists yet',
        description:
            'Make a playlist for the videos you want to watch together.',
        icon: Icons.playlist_add_rounded,
        actionLabel: 'Create a playlist',
        onAction: () => _showCreatePlaylist(context),
      );
    }

    return Column(
      children: state.playlists
          .map(
            (playlist) => Container(
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Theme.of(context).dividerColor),
              ),
              child: ListTile(
                onTap: () => state.selectPlaylist(playlist.id),
                leading: const CircleAvatar(
                  backgroundColor: Color(0x1AF43F49),
                  child: Icon(
                    Icons.playlist_play_rounded,
                    color: StreamXColors.brand,
                  ),
                ),
                title: Text(
                  playlist.name,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                subtitle: Text(
                  '${playlist.videoIds.length} videos',
                  style: const TextStyle(fontSize: 10),
                ),
                trailing: IconButton(
                  tooltip: 'Delete ${playlist.name}',
                  onPressed: () => state.deletePlaylist(playlist.id),
                  icon: const Icon(Icons.delete_outline_rounded, size: 19),
                ),
              ),
            ),
          )
          .toList(),
    );
  }

  Future<void> _showCreatePlaylist(BuildContext context) async {
    final controller = TextEditingController();
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('New playlist'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLength: 100,
          textCapitalization: TextCapitalization.sentences,
          decoration: const InputDecoration(
            hintText: 'Weekend watches',
            labelText: 'Name',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final name = controller.text.trim();
              if (name.isEmpty) return;
              state.createPlaylist(name);
              Navigator.pop(dialogContext);
            },
            style: FilledButton.styleFrom(backgroundColor: StreamXColors.brand),
            child: const Text('Create'),
          ),
        ],
      ),
    );
    controller.dispose();
  }
}
