import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';

import '../data/preview_catalog.dart';
import '../models/streamx_video.dart';
import '../services/streamx_api.dart';

class StreamXPlaylist {
  StreamXPlaylist({required this.id, required this.name});

  final String id;
  final String name;
  final Set<String> videoIds = <String>{};
}

class StreamXState extends ChangeNotifier {
  StreamXState() {
    unawaited(refreshCatalog());
  }

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
  final List<StreamXVideo> _liveVideos = <StreamXVideo>[];
  static const _allCategory = StreamXCategory(name: 'All', slug: 'all');
  List<StreamXCategory> _categories = kDebugMode
      ? previewCategories
      : const [_allCategory];
  bool _previewMode = kDebugMode;
  bool catalogLoading = true;
  String? catalogError;
  bool _disposed = false;
  int _nextPlaylistId = 1;

  bool get previewMode => _previewMode;

  List<StreamXCategory> get categories => List.unmodifiable(_categories);

  List<StreamXVideo> get _catalogVideos =>
      _previewMode ? previewVideos : _liveVideos;

  Future<void> refreshCatalog() async {
    catalogLoading = true;
    catalogError = null;
    _notifyIfActive();

    try {
      final snapshot = await FirebaseFirestore.instance
          .collection('videos')
          .where('visibility', isEqualTo: 'public')
          .limit(100)
          .get();
      final now = DateTime.now();
      final videos =
          snapshot.docs
              .map(
                (document) => _videoFromDocument(document.id, document.data()),
              )
              .where((video) => video != null)
              .cast<StreamXVideo>()
              .where((video) => !video.createdAt.isAfter(now))
              .toList()
            ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

      _liveVideos
        ..clear()
        ..addAll(videos);
      _categories = _categoriesFromVideos(videos);
      if (!_categories.any((category) => category.slug == selectedCategory)) {
        selectedCategory = 'all';
      }
      _previewMode = false;
      catalogError = null;
      unawaited(_refreshThumbnails(videos));
    } catch (error) {
      debugPrint('StreamX live catalog could not be loaded: $error');
      _previewMode = kDebugMode;
      _categories = kDebugMode ? previewCategories : const [_allCategory];
      catalogError = error is FirebaseException &&
              error.code == 'permission-denied'
          ? 'StreamX cannot read the live video catalog. Check the Firestore read rules.'
          : 'StreamX could not load the live video catalog. Check your connection and retry.';
    } finally {
      catalogLoading = false;
      _notifyIfActive();
    }
  }

  StreamXVideo? _videoFromDocument(String id, Map<String, dynamic> data) {
    if (data['processingStatus'] != 'ready') return null;
    final publishedAt = _readDate(data['publishedAt']);
    if (publishedAt == null || publishedAt.isAfter(DateTime.now())) return null;

    final categoryName = data['categoryName'] is String
        ? data['categoryName'] as String
        : 'Other';
    final categorySlug = data['categorySlug'] is String
        ? data['categorySlug'] as String
        : 'other';
    final thumbnailUrl = data['thumbnailUrl'] is String
        ? data['thumbnailUrl'] as String
        : '';
    return StreamXVideo(
      id: id,
      title: data['title'] is String
          ? data['title'] as String
          : 'Untitled video',
      description: data['description'] is String
          ? data['description'] as String
          : '',
      creator: data['creatorDisplayName'] is String
          ? data['creatorDisplayName'] as String
          : 'StreamX creator',
      category: StreamXCategory(name: categoryName, slug: categorySlug),
      thumbnailUrl: thumbnailUrl,
      durationSeconds: (data['durationSeconds'] as num?)?.toInt() ?? 0,
      viewCount: (data['viewCount'] as num?)?.toInt() ?? 0,
      createdAt: _readDate(data['createdAt']) ?? publishedAt,
      playbackUrl: data['playbackUrl'] is String
          ? data['playbackUrl'] as String
          : null,
    );
  }

  DateTime? _readDate(Object? value) {
    if (value is Timestamp) return value.toDate();
    if (value is DateTime) return value;
    if (value is String) return DateTime.tryParse(value);
    return null;
  }

  List<StreamXCategory> _categoriesFromVideos(List<StreamXVideo> videos) {
    final categories = <String, StreamXCategory>{};
    for (final video in videos) {
      if (video.category.slug != 'all') {
        categories.putIfAbsent(video.category.slug, () => video.category);
      }
    }
    return [
      const StreamXCategory(name: 'All', slug: 'all'),
      ...categories.values,
    ];
  }

  Future<void> _refreshThumbnails(List<StreamXVideo> videos) async {
    try {
      final urls = await StreamXApi.thumbnailUrls(
        videos.take(50).map((video) => video.id).toList(),
      );
      if (urls.isEmpty || _disposed) return;
      for (var index = 0; index < _liveVideos.length; index++) {
        final video = _liveVideos[index];
        final url = urls[video.id];
        if (url != null) _liveVideos[index] = video.copyWith(thumbnailUrl: url);
      }
      _notifyIfActive();
    } catch (_) {
      // The catalog remains usable with its built-in artwork fallback.
    }
  }

  void _notifyIfActive() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }

  List<StreamXVideo> get homeVideos => _sortVideos(
    List<StreamXVideo>.of(_catalogVideos)
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
    final matches = _catalogVideos.where((video) {
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
      _sortVideos(List<StreamXVideo>.of(_catalogVideos), 'popular');

  List<StreamXVideo> get recentVideos =>
      _sortVideos(List<StreamXVideo>.of(_catalogVideos), 'newest');

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
      for (final video in _catalogVideos) video.id: video,
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
