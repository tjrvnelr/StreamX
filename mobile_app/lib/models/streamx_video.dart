class StreamXCategory {
  const StreamXCategory({required this.name, required this.slug});

  final String name;
  final String slug;
}

class StreamXVideo {
  const StreamXVideo({
    required this.id,
    required this.title,
    required this.description,
    required this.creator,
    required this.category,
    required this.thumbnailUrl,
    required this.durationSeconds,
    required this.viewCount,
    required this.createdAt,
    required this.playbackUrl,
  });

  final String id;
  final String title;
  final String description;
  final String creator;
  final StreamXCategory category;
  final String thumbnailUrl;
  final int durationSeconds;
  final int viewCount;
  final DateTime createdAt;
  final String playbackUrl;
}

String formatDuration(int seconds) {
  final safeSeconds = seconds < 0 ? 0 : seconds;
  final hours = safeSeconds ~/ 3600;
  final minutes = (safeSeconds % 3600) ~/ 60;
  final remainder = safeSeconds % 60;
  if (hours > 0) {
    return '$hours:${minutes.toString().padLeft(2, '0')}:${remainder.toString().padLeft(2, '0')}';
  }
  return '$minutes:${remainder.toString().padLeft(2, '0')}';
}

String formatViews(int views) {
  if (views >= 1000000) {
    return '${_shortNumber(views / 1000000)}M views';
  }
  if (views >= 1000) {
    return '${_shortNumber(views / 1000)}K views';
  }
  return '$views views';
}

String _shortNumber(double value) =>
    value.toStringAsFixed(1).replaceFirst(RegExp(r'\.0$'), '');

String formatAge(DateTime date) {
  final days = DateTime.now().difference(date).inDays;
  if (days < 1) return 'Today';
  if (days == 1) return '1 day ago';
  if (days < 7) return '$days days ago';
  final weeks = days ~/ 7;
  if (days < 35) return '$weeks ${weeks == 1 ? 'week' : 'weeks'} ago';
  final months = (days ~/ 30).clamp(1, 999);
  return '$months ${months == 1 ? 'month' : 'months'} ago';
}
