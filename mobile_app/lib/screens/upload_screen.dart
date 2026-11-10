import 'package:flutter/material.dart';

import '../state/streamx_state.dart';
import '../theme/streamx_theme.dart';
import '../widgets/streamx_components.dart';
import '../widgets/video_card.dart';

class UploadScreen extends StatelessWidget {
  const UploadScreen({required this.state, super.key});

  final StreamXState state;

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).textTheme.bodySmall?.color;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(18, 13, 18, 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'CREATOR STUDIO',
            style: TextStyle(
              color: StreamXColors.brand,
              fontSize: 9,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.4,
            ),
          ),
          const SizedBox(height: 7),
          const Text(
            'Upload video',
            style: TextStyle(
              fontSize: 29,
              fontWeight: FontWeight.w900,
              letterSpacing: -1,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            'Share a story with the StreamX community.',
            style: TextStyle(color: muted, fontSize: 12),
          ),
          const SizedBox(height: 22),
          const PreviewNotice(),
          const SizedBox(height: 18),
          EmptyStatePanel(
            title: 'Creator tools need an account',
            description: 'Connect Firebase and sign in to upload videos, manage your videos, and view creator metrics.',
            icon: Icons.lock_outline_rounded,
            actionLabel: 'Browse videos',
            onAction: () => state.setCurrentTab(1),
          ),
          const SizedBox(height: 19),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.shield_outlined,
                  color: StreamXColors.brand,
                  size: 19,
                ),
                const SizedBox(width: 11),
                Expanded(
                  child: Text(
                    'Video uploads use secure, private storage and become available after processing. Account and API setup is required before mobile uploads can be enabled.',
                    style: TextStyle(
                      color: muted,
                      fontSize: 10.5,
                      height: 1.55,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
