# StreamX Mobile

StreamX Mobile is the Flutter Android app for the [StreamX project](https://github.com/tjrvnelr/StreamX). You can build the app from source, or download an APK from a GitHub Release when one has been published.

## Download and install a ready-made APK

This repository ignores Flutter's generated `build/` directory. A public source repository does not automatically contain an installable APK, so the project owner must attach the APK to a GitHub Release for direct downloads.

1. Open the [StreamX Releases page](https://github.com/tjrvnelr/StreamX/releases).
2. Open the newest release.
3. Under **Assets**, download `app-release.apk` to an Android phone.
4. Open the downloaded APK and follow Android's install prompts. If Android asks, allow installation from the app you used to download the file.
5. Open **StreamX** after installation.

APK files are for Android.

## Build the APK from source

Use this when there is no APK attached to a release, or when you want to build the latest source yourself.

### Requirements

- Git
- The [Flutter SDK](https://docs.flutter.dev/get-started/install)
- Android Studio with the Android SDK and command-line tools
- An Android phone with USB debugging enabled, or an Android emulator

### Steps

1. Clone the public repository:

   ```powershell
   git clone https://github.com/tjrvnelr/StreamX.git
   ```

2. Change to the Flutter app directory:

   ```powershell
   cd StreamX\mobile_app
   ```

3. Download the Flutter package dependencies:

   ```powershell
   flutter pub get
   ```

   On Windows, Flutter may require **Developer Mode** for plugin symlinks. If you see a symlink support error, enable Developer Mode in Windows Settings, then run `flutter pub get` again.

4. Build a release APK:

   ```powershell
   flutter build apk --release
   ```

5. Find the APK here:

   ```text
   build\app\outputs\flutter-apk\app-release.apk
   ```

6. Copy `app-release.apk` to your Android phone, open it, and follow the install prompts. You can also connect a device with USB debugging and run `flutter install` from `mobile_app`.

## Publish an APK for other people to download

After building the APK, the repository owner can make it available as a direct download:

1. Open the repository's [Releases page](https://github.com/tjrvnelr/StreamX/releases) and choose **Draft a new release**.
2. Enter a version tag, such as `v1.0.0`, and a short release title.
3. Upload `mobile_app/build/app/outputs/flutter-apk/app-release.apk` under **Attach binaries**.
4. Publish the release.

The APK remains available as a release asset even though Git ignores the local `build/` directory. Avoid committing generated build output to the source repository.

## Current app data

The mobile app currently uses the StreamX preview catalog. Firebase sign-in, live catalog syncing, and creator uploads have not been connected in this Flutter app yet.
