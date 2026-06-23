# iOS Capacitor Wrapper

This repo uses Capacitor to package the Vite/React app as an iOS app.

## App identity

- App name: `Trip Planner`
- Bundle ID: `com.jaydugar.tripplanner`
- Web assets directory: `dist`

## Local workflow

Build the web app and sync it into the native iOS project:

```bash
pnpm ios:sync
```

Open the project in Xcode:

```bash
pnpm ios:open
```

In Xcode, open `ios/App/App.xcodeproj`, select the `App` scheme, choose a signing team, then build/run/archive.

## App Store path

1. Enroll in the Apple Developer Program.
2. In Xcode, set the signing team for the `App` target.
3. Create an App Store Connect app record with bundle ID `com.jaydugar.tripplanner`.
4. Archive the app from Xcode.
5. Upload the archive to App Store Connect.
6. Test with TestFlight, then submit for App Review.

## Current local Xcode note

The iOS project has been generated and Capacitor packages resolve. On this Mac, `xcodebuild` currently reports that the iOS platform/runtime needs to be installed from Xcode > Settings > Components before command-line iOS builds can complete.
