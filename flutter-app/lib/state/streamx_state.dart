import 'package:flutter/foundation.dart';

import '../data/preview_catalog.dart';
import '../models/streamx_video.dart';

class StreamXPlaylist {
  StreamXPlaylist({required this.id, required this.name});

  final String id;
  final String name;
  final Set<String> videoIds = <String>{};
}

class StreamXState extends ChangeNotifier {
  int currentTab = 0;
  String selectedCategory = 'all';
  String searchQuery = '';
  String sortMode = 'newest';
  String libraryTab = 'history';
  String? selectedPlaylistId;

  final Set<String> _likedVideoIds = <String>{};
  final Set<String> _watchLaterIds = <String>{};
  final List<String> _historyIds = <String>[];
  final Map<String, int> _progressSeconds = <String, int>{};
  final List<StreamXPlaylist> _playlists = <StreamXPlaylist>[];
  int _nextPlaylistId = 1;

  List<StreamXVideo> get homeVideos => _sortVideos(
    previewVideos
        .where(
          (video) =>
              selectedCategory == 'all' ||
              video.category.slug == selectedCategory,
        )
        .toList(),
    'newest',
  );

  List<StreamXVideo> get visibleVideos {
    final query = searchQuery.trim().toLowerCase();
    final matches = previewVideos.where((video) {
      final matchesCategory =
          selectedCategory == 'all' || video.category.slug == selectedCategory;
      final searchable =
          '${video.title} ${video.description} ${video.creator} ${video.category.name}'
              .toLowerCase();
      return matchesCategory && (query.isEmpty || searchable.contains(query));
    }).toList();
    return _sortVideos(matches, sortMode);
  }

  List<StreamXVideo> get trendingVideos =>
      _sortVideos(List<StreamXVideo>.of(previewVideos), 'popular');

  List<StreamXVideo> get recentVideos =>
      _sortVideos(List<StreamXVideo>.of(previewVideos), 'newest');

  List<StreamXPlaylist> get playlists => List.unmodifiable(_playlists);

  List<StreamXVideo> get historyVideos => _videosForIds(_historyIds);

  List<StreamXVideo> get watchLaterVideos =>
      _videosForIds(_watchLaterIds.toList());

  List<StreamXVideo> get likedVideos => _videosForIds(_likedVideoIds.toList());

  List<StreamXVideo> get selectedPlaylistVideos {
    final playlist = _playlistById(selectedPlaylistId);
    return playlist == null
        ? <StreamXVideo>[]
        : _videosForIds(playlist.videoIds.toList());
  }

  bool isLiked(String videoId) => _likedVideoIds.contains(videoId);

  bool isSaved(String videoId) => _watchLaterIds.contains(videoId);

  int? progressFor(String videoId) => _progressSeconds[videoId];

  int? progressPercentFor(StreamXVideo video) {
    final seconds = _progressSeconds[video.id];
    if (seconds == null || video.durationSeconds < 1) return null;
    return ((seconds / video.durationSeconds) * 100).round().clamp(0, 100);
  }

  void setCurrentTab(int value) {
    currentTab = value;
    notifyListeners();
  }

  void setSelectedCategory(String value) {
    selectedCategory = value;
    notifyListeners();
  }

  void setSearchQuery(String value) {
    searchQuery = value;
    notifyListeners();
  }

  void setSortMode(String value) {
    sortMode = value;
    notifyListeners();
  }

  void setLibraryTab(String value) {
    libraryTab = value;
    selectedPlaylistId = null;
    notifyListeners();
  }

  void selectPlaylist(String? id) {
    selectedPlaylistId = id;
    notifyListeners();
  }

  void toggleLiked(String videoId) {
    if (!_likedVideoIds.add(videoId)) _likedVideoIds.remove(videoId);
    notifyListeners();
  }

  void toggleWatchLater(String videoId) {
    if (!_watchLaterIds.add(videoId)) _watchLaterIds.remove(videoId);
    notifyListeners();
  }

  void recordWatch(String videoId) {
    _historyIds.remove(videoId);
    _historyIds.insert(0, videoId);
    notifyListeners();
  }

  void saveProgress(String videoId, int seconds) {
    if (seconds < 0) return;
    _progressSeconds[videoId] = seconds;
    notifyListeners();
  }

  void removeFromLibrary(String videoId) {
    switch (libraryTab) {
      case 'history':
        _historyIds.remove(videoId);
      case 'later':
        _watchLaterIds.remove(videoId);
      case 'liked':
        _likedVideoIds.remove(videoId);
    }
    notifyListeners();
  }

  String createPlaylist(String name) {
    final playlist = StreamXPlaylist(
      id: 'playlist-${_nextPlaylistId++}',
      name: name.trim(),
    );
    _playlists.insert(0, playlist);
    notifyListeners();
    return playlist.id;
  }

  void deletePlaylist(String playlistId) {
    _playlists.removeWhere((playlist) => playlist.id == playlistId);
    if (selectedPlaylistId == playlistId) selectedPlaylistId = null;
    notifyListeners();
  }

  bool addToPlaylist(String playlistId, String videoId) {
    final playlist = _playlistById(playlistId);
    if (playlist == null) return false;
    final added = playlist.videoIds.add(videoId);
    notifyListeners();
    return added;
  }

  void removeFromPlaylist(String playlistId, String videoId) {
    _playlistById(playlistId)?.videoIds.remove(videoId);
    notifyListeners();
  }

  List<StreamXVideo> _videosForIds(List<String> ids) {
    final videosById = <String, StreamXVideo>{
      for (final video in previewVideos) video.id: video,
    };
    return ids.map((id) => videosById[id]).whereType<StreamXVideo>().toList();
  }

  StreamXPlaylist? _playlistById(String? id) {
    if (id == null) return null;
    for (final playlist in _playlists) {
      if (playlist.id == id) return playlist;
    }
    return null;
  }

  List<StreamXVideo> _sortVideos(List<StreamXVideo> videos, String mode) {
    switch (mode) {
      case 'popular':
        videos.sort((a, b) => b.viewCount.compareTo(a.viewCount));
      case 'relevance':
        break;
      default:
        videos.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    }
    return videos;
  }
}
