# StreamX Mobile

StreamX Mobile is the Flutter Android app for the [StreamX project](https://github.com/tjrvnelr/StreamX). You can build the app from source, or download an APK from a GitHub Release when one has been published.

The mobile catalog reads published public videos from the StreamX Firestore project. Playback and private video artwork use the StreamX API at `https://streamx-57z2.onrender.com/api`. Set `STREAMX_API_URL` with a Dart define when compiling if the API is hosted at a different URL.

## Download and install a ready-made APK

This repository ignores Flutter's generated `build/` directory. A public source repository does not automatically contain an installable APK, so the project owner must attach the APK to a GitHub Release for direct downloads.

1. Open the [StreamX Releases page](https://github.com/tjrvnelr/StreamX/releases).
2. Open the newest release.
3. Under **Assets**, download `app-release.apk` to an Android phone.
4. Open the downloaded APK and follow Android's install prompts. If Android asks, allow installation from the app you used to download the file.
5. Open **StreamX** after installation.

APK files are for Android.
