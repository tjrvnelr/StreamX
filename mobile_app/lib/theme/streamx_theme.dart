import 'package:flutter/material.dart';

class StreamXColors {
  static const brand = Color(0xFFF43F49);

  static const darkCanvas = Color(0xFF111419);
  static const darkSurface = Color(0xFF171B20);
  static const darkRaised = Color(0xFF1B2026);
  static const darkLifted = Color(0xFF222930);
  static const darkLine = Color(0xFF2A3038);
  static const darkInk = Color(0xFFF3F5F8);
  static const darkMuted = Color(0xFF9AA2AD);
  static const darkDim = Color(0xFF8793A3);

  static const lightCanvas = Color(0xFFEDF0F4);
  static const lightSurface = Color(0xFFEDF0F4);
  static const lightRaised = Color(0xFFF4F6F9);
  static const lightLifted = Color(0xFFE1E6EC);
  static const lightLine = Color(0xFFD3D9E1);
  static const lightInk = Color(0xFF1F252E);
  static const lightMuted = Color(0xFF57616E);
  static const lightDim = Color(0xFF5B6574);
}

ThemeData streamXTheme(Brightness brightness) {
  final isDark = brightness == Brightness.dark;
  final canvas = isDark ? StreamXColors.darkCanvas : StreamXColors.lightCanvas;
  final surface = isDark
      ? StreamXColors.darkSurface
      : StreamXColors.lightSurface;
  final raised = isDark ? StreamXColors.darkRaised : StreamXColors.lightRaised;
  final line = isDark ? StreamXColors.darkLine : StreamXColors.lightLine;
  final ink = isDark ? StreamXColors.darkInk : StreamXColors.lightInk;
  final muted = isDark ? StreamXColors.darkMuted : StreamXColors.lightMuted;
  final dim = isDark ? StreamXColors.darkDim : StreamXColors.lightDim;

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    scaffoldBackgroundColor: canvas,
    colorScheme:
        ColorScheme.fromSeed(
          seedColor: StreamXColors.brand,
          brightness: brightness,
        ).copyWith(
          primary: StreamXColors.brand,
          onPrimary: Colors.white,
          surface: surface,
          onSurface: ink,
          secondary: const Color(0xFF78AAFF),
          outline: line,
        ),
    appBarTheme: AppBarTheme(
      backgroundColor: canvas,
      foregroundColor: ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      surfaceTintColor: Colors.transparent,
      iconTheme: IconThemeData(color: muted),
    ),
    navigationBarTheme: NavigationBarThemeData(
      height: 70,
      backgroundColor: surface,
      indicatorColor: StreamXColors.brand.withValues(alpha: .14),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return TextStyle(
          fontSize: 10,
          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          color: selected ? StreamXColors.brand : dim,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith(
        (states) => IconThemeData(
          color: states.contains(WidgetState.selected)
              ? StreamXColors.brand
              : dim,
        ),
      ),
    ),
    textTheme: const TextTheme().apply(bodyColor: ink, displayColor: ink),
    dividerColor: line,
    snackBarTheme: SnackBarThemeData(
      backgroundColor: raised,
      contentTextStyle: TextStyle(color: ink, fontSize: 13),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
    iconTheme: IconThemeData(color: muted),
    chipTheme: ChipThemeData(
      backgroundColor: surface,
      selectedColor: StreamXColors.brand,
      side: BorderSide(color: line),
      labelStyle: TextStyle(
        color: muted,
        fontSize: 11,
        fontWeight: FontWeight.w600,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
      shape: const StadiumBorder(),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: surface,
      hintStyle: TextStyle(color: dim, fontSize: 13),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: BorderSide(color: line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: BorderSide(color: line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: StreamXColors.brand, width: 1.4),
      ),
    ),
  );
}
