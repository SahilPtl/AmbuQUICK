# AmbuFree Android App

An ambulance coordination system for emergency response, built as a native Android application using React Native.

## Features

- Car User interface for receiving ambulance alerts
- Dispatch interface for emergency responders
- Real-time location tracking and mapping
- Geofencing for proximity alerts
- Emergency notification system

## Setup and Build Process

This project is set up to be built using Android Studio. Follow these steps to build the app:

1. Install the required dependencies:
   - React Native CLI
   - Android Studio
   - Java Development Kit (JDK) 8+
   - Node.js and npm

2. Open the android folder in Android Studio

3. Update the Google Maps API Key in AndroidManifest.xml

4. Build the app using Gradle:
   ```
   ./gradlew assembleDebug
   ```

5. The APK will be available at: `android/app/build/outputs/apk/debug/app-debug.apk`

## Architecture

The app follows a component-based architecture using React Native for the UI and native Android code for device-specific functionality.

- Screens: Main UI components representing full screens in the app
- Components: Reusable UI elements
- Navigation: Handles routing between different screens
- Services: Manages API calls and external integrations
- Hooks: Custom React hooks for shared logic
- Utils: Utility functions and helpers

## Location Services

The app uses native Android location services via the `@react-native-community/geolocation` package. It requires the following permissions:

- ACCESS_FINE_LOCATION
- ACCESS_COARSE_LOCATION
- ACCESS_BACKGROUND_LOCATION (for tracking when app is in background)
- FOREGROUND_SERVICE

## Mapping

Maps are implemented using `react-native-maps` which provides a component that wraps Google Maps on Android.

## Push Notifications

The app uses Firebase Cloud Messaging (FCM) for push notifications to alert drivers about approaching ambulances.
