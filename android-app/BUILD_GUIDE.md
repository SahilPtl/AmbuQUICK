# AmbuFree Android App Build Guide

This guide provides step-by-step instructions for building and running the AmbuFree Android application.

## Prerequisites

- Node.js (v14 or higher)
- Java Development Kit (JDK 11)
- Android Studio
- Android SDK with build tools
- React Native CLI

## Environment Setup

1. Install the React Native development environment:
   ```
   npm install -g react-native-cli
   ```

2. Install project dependencies:
   ```
   cd android-app
   npm install
   ```

3. Create a `local.properties` file in the `/android` directory with:
   ```
   sdk.dir = /path/to/your/Android/sdk
   ```

## Building the App

### Development Build

1. Start Metro bundler:
   ```
   npx react-native start
   ```

2. Run on Android device or emulator:
   ```
   npx react-native run-android
   ```

### Production Build

1. Generate a signed APK:
   ```
   cd android
   ./gradlew assembleRelease
   ```

2. The APK will be available at:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

## Key Features

- Optimized for Android devices with native performance
- Real-time ambulance tracking with emergency alerts
- Geofencing functionality for proximity notifications
- Deep integration with Android location services
- Push notifications using Firebase Cloud Messaging
- Offline capability with data sync

## Troubleshooting

If you encounter map display issues:
1. Ensure Google Maps API key is properly configured in `android/app/src/main/AndroidManifest.xml`
2. Check location permissions are granted to the app
3. Verify internet connectivity for map tiles and real-time updates

## Performance Considerations

- The app uses React Native Maps with native module bindings for optimal performance
- WebSockets are implemented with native modules to prevent disconnection issues
- Background services ensure location updates even when app is minimized

## Security

- API keys are stored securely using Android's BuildConfig and are not exposed in the JS bundle
- Location data is encrypted in transit
- Authentication tokens use secure storage

## Dependencies

- @react-navigation/native: Navigation container
- react-native-maps: Native map implementation
- react-native-geolocation: Native location services
- react-native-background-fetch: Background tasks
- react-native-push-notification: Native notifications