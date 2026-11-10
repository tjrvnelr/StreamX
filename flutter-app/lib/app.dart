import 'package:flutter/material.dart';

import 'screens/account_screen.dart';
import 'screens/explore_screen.dart';
import 'screens/home_screen.dart';
import 'screens/library_screen.dart';
import 'screens/upload_screen.dart';
import 'state/streamx_state.dart';
import 'theme/streamx_theme.dart';

class StreamXApp extends StatefulWidget {
  const StreamXApp({super.key});

  @override
  State<StreamXApp> createState() => _StreamXAppState();
}

class _StreamXAppState extends State<StreamXApp> {
  final StreamXState _streamXState = StreamXState();
  final FocusNode _searchFocusNode = FocusNode();
  ThemeMode _themeMode = ThemeMode.dark;

  @override
  void dispose() {
    _searchFocusNode.dispose();
    _streamXState.dispose();
    super.dispose();
  }

  void _toggleTheme() {
    setState(() {
      _themeMode = _themeMode == ThemeMode.dark
          ? ThemeMode.light
          : ThemeMode.dark;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'StreamX',
      debugShowCheckedModeBanner: false,
      theme: streamXTheme(Brightness.light),
      darkTheme: streamXTheme(Brightness.dark),
      themeMode: _themeMode,
      home: StreamXShell(
        state: _streamXState,
        searchFocusNode: _searchFocusNode,
        themeMode: _themeMode,
        onToggleTheme: _toggleTheme,
      ),
    );
  }
}

class StreamXShell extends StatelessWidget {
  const StreamXShell({
    required this.state,
    required this.searchFocusNode,
    required this.themeMode,
    required this.onToggleTheme,
    super.key,
  });

  final StreamXState state;
  final FocusNode searchFocusNode;
  final ThemeMode themeMode;
  final VoidCallback onToggleTheme;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: state,
      builder: (context, _) => Scaffold(
        appBar: AppBar(
          toolbarHeight: 62,
          titleSpacing: 18,
          title: const _StreamXWordmark(),
          actions: [
            IconButton(
              tooltip: 'Search videos',
              onPressed: () {
                state.setCurrentTab(1);
                searchFocusNode.requestFocus();
              },
              icon: const Icon(Icons.search_rounded),
            ),
            IconButton(
              tooltip: themeMode == ThemeMode.dark
                  ? 'Switch to light theme'
                  : 'Switch to dark theme',
              onPressed: onToggleTheme,
              icon: Icon(
                themeMode == ThemeMode.dark
                    ? Icons.light_mode_outlined
                    : Icons.dark_mode_outlined,
              ),
            ),
            const SizedBox(width: 6),
          ],
        ),
        body: IndexedStack(
          index: state.currentTab,
          children: [
            HomeScreen(state: state),
            ExploreScreen(state: state, searchFocusNode: searchFocusNode),
            LibraryScreen(state: state),
            UploadScreen(state: state),
            AccountScreen(
              onToggleTheme: onToggleTheme,
              themeMode: themeMode,
              state: state,
            ),
          ],
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: state.currentTab,
          onDestinationSelected: state.setCurrentTab,
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home_rounded),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Icon(Icons.explore_outlined),
              selectedIcon: Icon(Icons.explore_rounded),
              label: 'Explore',
            ),
            NavigationDestination(
              icon: Icon(Icons.video_library_outlined),
              selectedIcon: Icon(Icons.video_library_rounded),
              label: 'Library',
            ),
            NavigationDestination(
              icon: Icon(Icons.cloud_upload_outlined),
              selectedIcon: Icon(Icons.cloud_upload_rounded),
              label: 'Upload',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline_rounded),
              selectedIcon: Icon(Icons.person_rounded),
              label: 'Account',
            ),
          ],
        ),
      ),
    );
  }
}

class _StreamXWordmark extends StatelessWidget {
  const _StreamXWordmark();

  @override
  Widget build(BuildContext context) {
    final ink = Theme.of(context).colorScheme.onSurface;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF941B22), StreamXColors.brand],
            ),
          ),
          child: const Icon(
            Icons.movie_creation_outlined,
            color: Colors.white,
            size: 18,
          ),
        ),
        const SizedBox(width: 9),
        Text.rich(
          TextSpan(
            style: TextStyle(
              color: ink,
              fontSize: 18,
              fontWeight: FontWeight.w800,
              letterSpacing: -1,
            ),
            children: const [
              TextSpan(text: 'stream'),
              TextSpan(
                text: 'x',
                style: TextStyle(color: StreamXColors.brand),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
