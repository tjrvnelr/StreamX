import 'package:flutter/material.dart';

import '../state/streamx_state.dart';
import '../theme/streamx_theme.dart';

class AccountScreen extends StatelessWidget {
  const AccountScreen({
    required this.onToggleTheme,
    required this.themeMode,
    required this.state,
    super.key,
  });

  final VoidCallback onToggleTheme;
  final ThemeMode themeMode;
  final StreamXState state;

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).textTheme.bodySmall?.color;
    final isDark = themeMode == ThemeMode.dark;
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 13, 18, 28),
      children: [
        const Text(
          'ACCOUNT',
          style: TextStyle(
            color: StreamXColors.brand,
            fontSize: 9,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.4,
          ),
        ),
        const SizedBox(height: 7),
        const Text(
          'Settings',
          style: TextStyle(
            fontSize: 29,
            fontWeight: FontWeight.w900,
            letterSpacing: -1,
          ),
        ),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.all(17),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: Row(
            children: [
              const CircleAvatar(
                radius: 25,
                backgroundColor: Color(0x1AF43F49),
                child: Icon(
                  Icons.person_outline_rounded,
                  color: StreamXColors.brand,
                  size: 25,
                ),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Your StreamX account',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Sign in to sync your library and creator tools.',
                      style: TextStyle(
                        color: muted,
                        fontSize: 10.5,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, size: 20),
            ],
          ),
        ),
        const SizedBox(height: 21),
        Text(
          'PREFERENCES',
          style: TextStyle(
            color: muted,
            fontSize: 9,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 9),
        _SettingsTile(
          icon: isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
          title: 'Appearance',
          subtitle: isDark ? 'Dark theme' : 'Light theme',
          trailing: Switch.adaptive(
            value: isDark,
            activeTrackColor: StreamXColors.brand,
            onChanged: (_) => onToggleTheme(),
          ),
          onTap: onToggleTheme,
        ),
        const SizedBox(height: 9),
        _SettingsTile(
          icon: Icons.cloud_upload_outlined,
          title: 'Creator studio',
          subtitle: 'Upload and manage your videos',
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: () => state.setCurrentTab(3),
        ),
        const SizedBox(height: 9),
        _SettingsTile(
          icon: Icons.video_library_outlined,
          title: 'Your library',
          subtitle: 'History, saved videos, and playlists',
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: () => state.setCurrentTab(2),
        ),
        const SizedBox(height: 24),
        Text(
          'ABOUT STREAMX',
          style: TextStyle(
            color: muted,
            fontSize: 9,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.movie_creation_outlined,
                color: StreamXColors.brand,
                size: 20,
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'StreamX mobile',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                ),
              ),
              Text(
                'Preview build',
                style: TextStyle(color: muted, fontSize: 10),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.trailing,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Widget trailing;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: Row(
            children: [
              Icon(icon, color: StreamXColors.brand, size: 19),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: Theme.of(context).textTheme.bodySmall?.color,
                        fontSize: 9.5,
                      ),
                    ),
                  ],
                ),
              ),
              trailing,
            ],
          ),
        ),
      ),
    );
  }
}
