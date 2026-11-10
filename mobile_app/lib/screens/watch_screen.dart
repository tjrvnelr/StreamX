import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:video_player/video_player.dart';

import '../models/streamx_video.dart';
import '../state/streamx_state.dart';
import '../theme/streamx_theme.dart';
import '../widgets/streamx_components.dart';
import '../widgets/video_card.dart';

class WatchScreen extends StatefulWidget {
  const WatchScreen({required this.video, required this.state, super.key});

  final StreamXVideo video;
  final StreamXState state;

  @override
  State<WatchScreen> createState() => _WatchScreenState();
}

class _WatchScreenState extends State<WatchScreen> {
  VideoPlayerController? _controller;
  Timer? _hideControlsTimer;
  bool _loading = true;
  bool _showControls = true;
  String? _error;
  bool _recordedPlay = false;
  int _lastSavedSecond = 0;
  bool _descriptionExpanded = false;

  @override
  void initState() {
    super.initState();
    unawaited(_initializePlayer());
  }

  Future<void> _initializePlayer() async {
    final controller = VideoPlayerController.networkUrl(
      Uri.parse(widget.video.playbackUrl),
    );
    _controller = controller;
    try {
      await controller.initialize();
      if (!mounted) return;
      controller.addListener(_onPlayerChanged);
      setState(() => _loading = false);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'This preview clip could not be loaded. Check your connection and try again.';
      });
    }
  }

  void _onPlayerChanged() {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    final value = controller.value;
    if (value.isPlaying && !_recordedPlay) {
      _recordedPlay = true;
      widget.state.recordWatch(widget.video.id);
    }
    final seconds = value.position.inSeconds;
    if (value.isPlaying && seconds - _lastSavedSecond >= 15) {
      _lastSavedSecond = seconds;
      widget.state.saveProgress(widget.video.id, seconds);
    }
  }

  @override
  void dispose() {
    _hideControlsTimer?.cancel();
    _controller?.removeListener(_onPlayerChanged);
    _controller?.dispose();
    super.dispose();
  }

  void _toggleControls() {
    setState(() => _showControls = !_showControls);
    _hideControlsTimer?.cancel();
    final controller = _controller;
    if (_showControls && controller?.value.isPlaying == true) {
      _hideControlsTimer = Timer(const Duration(seconds: 3), () {
        if (mounted && controller?.value.isPlaying == true) {
          setState(() => _showControls = false);
        }
      });
    }
  }

  Future<void> _togglePlayback() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    if (controller.value.isPlaying) {
      await controller.pause();
    } else {
      await controller.play();
      _hideControlsTimer?.cancel();
      _hideControlsTimer = Timer(const Duration(seconds: 3), () {
        if (mounted && controller.value.isPlaying) {
          setState(() => _showControls = false);
        }
      });
    }
    if (mounted) setState(() => _showControls = true);
  }

  Future<void> _copyVideoTitle() async {
    await Clipboard.setData(
      ClipboardData(text: 'StreamX: ${widget.video.title}'),
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('Video title copied.')));
  }

  Future<void> _showPlaylistPicker() async {
    if (widget.state.playlists.isEmpty) {
      await showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        builder: (context) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 26),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Add to playlist',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Text(
                  'Create a playlist in your library before adding videos.',
                  style: TextStyle(
                    color: Theme.of(context).textTheme.bodySmall?.color,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 14),
                FilledButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    widget.state.setLibraryTab('playlists');
                    widget.state.setCurrentTab(2);
                  },
                  icon: const Icon(Icons.playlist_add_rounded),
                  label: const Text('Open playlists'),
                  style: FilledButton.styleFrom(
                    backgroundColor: StreamXColors.brand,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
      return;
    }

    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(18, 0, 18, 20),
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(8, 4, 8, 8),
              child: Text(
                'Add to playlist',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
              ),
            ),
            ...widget.state.playlists.map(
              (playlist) => ListTile(
                leading: const Icon(
                  Icons.playlist_play_rounded,
                  color: StreamXColors.brand,
                ),
                title: Text(playlist.name),
                trailing: Icon(
                  playlist.videoIds.contains(widget.video.id)
                      ? Icons.check_circle_rounded
                      : Icons.add_circle_outline_rounded,
                  color: playlist.videoIds.contains(widget.video.id)
                      ? StreamXColors.brand
                      : Theme.of(context).textTheme.bodySmall?.color,
                ),
                onTap: () {
                  widget.state.addToPlaylist(playlist.id, widget.video.id);
                  Navigator.pop(context);
                  ScaffoldMessenger.of(this.context).showSnackBar(
                    SnackBar(content: Text('Added to ${playlist.name}.')),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final video = widget.video;
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(
          video.category.name,
          style: TextStyle(
            color: theme.textTheme.bodySmall?.color,
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
        centerTitle: false,
        actions: [
          IconButton(
            tooltip: 'Copy video title',
            onPressed: _copyVideoTitle,
            icon: const Icon(Icons.ios_share_rounded),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 2, 16, 30),
        children: [
          _playerSurface(),
          const SizedBox(height: 16),
          Row(
            children: [
              _Tag(label: video.category.name),
              const SizedBox(width: 7),
              const _Tag(label: 'Preview video', brand: true),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            video.title,
            style: const TextStyle(
              fontSize: 22,
              height: 1.2,
              fontWeight: FontWeight.w900,
              letterSpacing: -.65,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            '${formatViews(video.viewCount)}  ·  ${formatAge(video.createdAt)}',
            style: TextStyle(
              color: theme.textTheme.bodySmall?.color,
              fontSize: 10.5,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 15),
          AnimatedBuilder(
            animation: widget.state,
            builder: (context, _) => Row(
              children: [
                Expanded(
                  child: _ActionPill(
                    icon: widget.state.isLiked(video.id)
                        ? Icons.favorite_rounded
                        : Icons.favorite_border_rounded,
                    label: widget.state.isLiked(video.id) ? 'Liked' : 'Like',
                    selected: widget.state.isLiked(video.id),
                    onTap: () => widget.state.toggleLiked(video.id),
                  ),
                ),
                const SizedBox(width: 7),
                Expanded(
                  child: _ActionPill(
                    icon: widget.state.isSaved(video.id)
                        ? Icons.bookmark_rounded
                        : Icons.bookmark_border_rounded,
                    label: widget.state.isSaved(video.id) ? 'Saved' : 'Save',
                    selected: widget.state.isSaved(video.id),
                    onTap: () => widget.state.toggleWatchLater(video.id),
                  ),
                ),
                const SizedBox(width: 7),
                Expanded(
                  child: _ActionPill(
                    icon: Icons.playlist_add_rounded,
                    label: 'Playlist',
                    onTap: _showPlaylistPicker,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(15),
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: theme.dividerColor.withValues(alpha: .8),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: StreamXColors.brand.withValues(
                        alpha: .12,
                      ),
                      child: Text(
                        _initials(video.creator),
                        style: const TextStyle(
                          color: StreamXColors.brand,
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    const SizedBox(width: 11),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            video.creator,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            'StreamX creator',
                            style: TextStyle(
                              color: theme.textTheme.bodySmall?.color,
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () => _showMessage(
                        'Creator profiles are available with the live catalog.',
                      ),
                      child: const Text(
                        'Profile',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 13),
                Text(
                  video.description,
                  maxLines: _descriptionExpanded ? null : 3,
                  overflow: _descriptionExpanded
                      ? TextOverflow.visible
                      : TextOverflow.ellipsis,
                  style: TextStyle(
                    color: theme.textTheme.bodySmall?.color,
                    fontSize: 11.5,
                    height: 1.6,
                  ),
                ),
                if (video.description.length > 150)
                  TextButton(
                    onPressed: () => setState(
                      () => _descriptionExpanded = !_descriptionExpanded,
                    ),
                    style: TextButton.styleFrom(
                      padding: EdgeInsets.zero,
                      visualDensity: VisualDensity.compact,
                    ),
                    child: Text(
                      _descriptionExpanded ? 'Show less' : 'Show more',
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 9),
          Text(
            'Preview clip uses a Creative Commons sample video; the title and view data are illustrative.',
            style: TextStyle(
              color: theme.textTheme.bodySmall?.color?.withValues(alpha: .8),
              fontSize: 9.5,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 25),
          const SectionHeading(title: 'Up next', eyebrow: 'Keep watching'),
          const SizedBox(height: 13),
          ...widget.state.trendingVideos
              .where((item) => item.id != video.id)
              .take(5)
              .map(
                (item) => Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: VideoCard(
                    video: item,
                    state: widget.state,
                    compact: true,
                    onTap: () =>
                        Navigator.of(context).pushReplacement<void, void>(
                          MaterialPageRoute<void>(
                            builder: (_) =>
                                WatchScreen(video: item, state: widget.state),
                          ),
                        ),
                  ),
                ),
              ),
        ],
      ),
    );
  }

  Widget _playerSurface() {
    final controller = _controller;
    return AspectRatio(
      aspectRatio:
          controller?.value.isInitialized == true &&
              controller!.value.aspectRatio > 0
          ? controller.value.aspectRatio
          : 16 / 9,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (controller?.value.isInitialized == true)
              VideoPlayer(controller!)
            else
              VideoArtwork(imageUrl: widget.video.thumbnailUrl),
            if (controller?.value.isInitialized != true)
              ColoredBox(
                color: Colors.black.withValues(alpha: .24),
                child: Center(
                  child: _error != null
                      ? Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.wifi_off_rounded,
                              color: Colors.white,
                              size: 25,
                            ),
                            const SizedBox(height: 7),
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 24,
                              ),
                              child: Text(
                                _error!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                ),
                              ),
                            ),
                          ],
                        )
                      : _loading
                      ? const CircularProgressIndicator(
                          color: StreamXColors.brand,
                          strokeWidth: 2.5,
                        )
                      : const SizedBox.shrink(),
                ),
              ),
            if (controller?.value.isInitialized == true)
              ValueListenableBuilder<VideoPlayerValue>(
                valueListenable: controller!,
                builder: (context, value, _) => GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: _toggleControls,
                  child: Stack(
                    children: [
                      if (_showControls || !value.isPlaying)
                        Positioned.fill(
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  Colors.black.withValues(alpha: .06),
                                  Colors.transparent,
                                  Colors.black.withValues(alpha: .65),
                                ],
                                stops: const [0, .5, 1],
                              ),
                            ),
                          ),
                        ),
                      if (_showControls || !value.isPlaying)
                        Center(
                          child: IconButton.filled(
                            tooltip: value.isPlaying
                                ? 'Pause video'
                                : 'Play video',
                            onPressed: _togglePlayback,
                            style: IconButton.styleFrom(
                              backgroundColor: Colors.black.withValues(
                                alpha: .52,
                              ),
                              foregroundColor: Colors.white,
                              fixedSize: const Size(54, 54),
                            ),
                            iconSize: 30,
                            icon: Icon(
                              value.isPlaying
                                  ? Icons.pause_rounded
                                  : Icons.play_arrow_rounded,
                            ),
                          ),
                        ),
                      if (_showControls || !value.isPlaying)
                        Positioned(
                          left: 12,
                          right: 12,
                          bottom: 8,
                          child: Column(
                            children: [
                              VideoProgressIndicator(
                                controller,
                                allowScrubbing: true,
                                colors: const VideoProgressColors(
                                  playedColor: StreamXColors.brand,
                                  bufferedColor: Color(0x99FFFFFF),
                                  backgroundColor: Color(0x55FFFFFF),
                                ),
                                padding: const EdgeInsets.symmetric(
                                  vertical: 7,
                                ),
                              ),
                              Row(
                                children: [
                                  Text(
                                    _timeText(value.position),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 9,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const Spacer(),
                                  Text(
                                    _timeText(value.duration),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 9,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  String _initials(String name) {
    final parts = name
        .split(RegExp(r'[\s._-]+'))
        .where((part) => part.isNotEmpty)
        .take(2);
    return parts.map((part) => part[0].toUpperCase()).join();
  }

  String _timeText(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }
}

class _Tag extends StatelessWidget {
  const _Tag({required this.label, this.brand = false});

  final String label;
  final bool brand;

  @override
  Widget build(BuildContext context) {
    final color = brand
        ? StreamXColors.brand
        : Theme.of(context).textTheme.bodySmall?.color;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: brand
            ? StreamXColors.brand.withValues(alpha: .1)
            : Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(9),
        border: Border.all(
          color: brand
              ? StreamXColors.brand.withValues(alpha: .25)
              : Theme.of(context).dividerColor,
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 9,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _ActionPill extends StatelessWidget {
  const _ActionPill({
    required this.icon,
    required this.label,
    required this.onTap,
    this.selected = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).textTheme.bodySmall?.color;
    return Material(
      color: selected
          ? StreamXColors.brand.withValues(alpha: .1)
          : Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 5),
          child: Column(
            children: [
              Icon(
                icon,
                size: 18,
                color: selected ? StreamXColors.brand : muted,
              ),
              const SizedBox(height: 4),
              Text(
                label,
                maxLines: 1,
                style: TextStyle(
                  color: selected ? StreamXColors.brand : muted,
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
