import 'dart:async';
import 'dart:convert';
import 'dart:io';

const _apiBase = String.fromEnvironment(
  'STREAMX_API_URL',
  defaultValue: 'https://streamx-57z2.onrender.com/api',
);

String get _normalizedApiBase {
  final base = _apiBase.trim().replaceFirst(RegExp(r'/+$'), '');
  return base.endsWith('/api') ? base : '$base/api';
}

class StreamXApi {
  static Future<String> playbackUrl(String videoId) async {
    final payload = await _request(
      'GET',
      '/videos/${Uri.encodeComponent(videoId)}/playback',
    );
    final url = payload['playbackUrl'];
    if (url is! String || url.isEmpty) {
      throw const FormatException('The StreamX API returned no playback URL.');
    }
    return url;
  }

  static Future<Map<String, String>> thumbnailUrls(
    List<String> videoIds,
  ) async {
    if (videoIds.isEmpty) return const {};
    final payload = await _request(
      'POST',
      '/media/thumbnails',
      body: {'videoIds': videoIds},
    );
    final values = payload['thumbnails'];
    if (values is! Map) return const {};
    return values.map<String, String>(
      (key, value) => MapEntry(key.toString(), value.toString()),
    );
  }

  static Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, Object?>? body,
  }) async {
    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 20);
    try {
      final request = await client.openUrl(
        method,
        Uri.parse('$_normalizedApiBase$path'),
      );
      if (body != null) {
        request.headers.contentType = ContentType.json;
        request.write(jsonEncode(body));
      }
      final response = await request.close().timeout(
        const Duration(seconds: 35),
      );
      final responseBody = await response
          .transform(utf8.decoder)
          .join()
          .timeout(const Duration(seconds: 10));
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw HttpException(
          'StreamX API request failed (${response.statusCode}).',
        );
      }
      final decoded = jsonDecode(responseBody);
      if (decoded is! Map) {
        throw const FormatException('The StreamX API returned invalid JSON.');
      }
      return Map<String, dynamic>.from(decoded);
    } on TimeoutException {
      throw const HttpException('The StreamX API request timed out.');
    } finally {
      client.close(force: true);
    }
  }
}
