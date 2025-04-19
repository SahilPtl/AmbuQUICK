# AmbuFree Android App Overview

## Introduction

AmbuFree is a React Native Android application designed for ambulance coordination and emergency response. The app provides interfaces for both vehicle drivers and ambulance dispatchers to improve road safety and emergency response times.

## Core Features

### For Car Users
- **Real-time Alerts**: Receive notifications when an ambulance is approaching
- **Map Visualization**: See ambulance locations and routes on a map
- **Geofencing**: Location-based alerts with distance and ETA information
- **Background Operation**: Continue receiving alerts when the app is minimized

### For Dispatch Operators
- **Route Planning**: Set pickup locations and hospital destinations
- **Hospital Search**: Find and select nearby hospitals
- **Alert Management**: Control emergency alerts sent to vehicles
- **Route Monitoring**: Track ambulance progress in real-time

## Technology Stack

### Frontend Framework
- **React Native**: Cross-platform framework for building native mobile applications
- **React Navigation**: Navigation and routing between screens
- **React Native Paper**: Material Design components for UI

### Maps and Location
- **React Native Maps**: Wrapper around native map SDKs
- **@react-native-community/geolocation**: Location services
- **Google Maps SDK**: Maps rendering and geocoding (via native integration)

### State Management
- **React Hooks**: For local component state
- **Context API**: For global app state

### Networking
- **WebSockets**: Real-time communications for position updates and alerts
- **Fetch API**: HTTP requests to backend services

### Local Storage
- **AsyncStorage**: Persistent storage for user preferences and cached data

## Project Structure

```
/android-app
  /android             # Native Android configuration and code
  /src
    /assets            # Images, fonts, and other static assets
    /components        # Reusable UI components
    /hooks             # Custom React hooks
    /navigation        # Navigation configuration
    /screens           # Main app screens
    /services          # API and native service integrations
    /utils             # Helper functions and utilities
  App.tsx              # Main application component
  app.json             # Application configuration
  index.js             # Entry point
```

## Key Components

### Screens
- **UserTypeSelectionScreen**: Initial screen to choose user type
- **CarUserScreen**: Interface for regular vehicle drivers
- **DispatchScreen**: Interface for ambulance dispatchers
- **ProfileScreen**: User profile and settings

### Services
- **LocationService**: Manages geolocation functionality
- **WebSocketService**: Handles real-time communications
- **NotificationService**: Manages push notifications
- **ApiService**: Handles HTTP requests to backend APIs

### Custom Hooks
- **useGeolocation**: Simplified access to location data
- **useWebSocket**: WebSocket connection management
- **useNotifications**: Push notification management

## Native Integrations

The app uses several native Android capabilities:

1. **Location Services**: Access to GPS and network location
2. **Maps**: Native Google Maps SDK integration
3. **Notifications**: Background alerts via Firebase Cloud Messaging
4. **Background Processing**: Service for continued operation when minimized

## Architecture

The app follows a layered architecture:

1. **UI Layer**: React Native components and screens
2. **Business Logic Layer**: Hooks and services
3. **Data Access Layer**: API calls and local storage
4. **Native Bridge Layer**: Integration with Android platform capabilities

## Performance Considerations

- **Location Tracking**: Optimized to balance accuracy and battery usage
- **Map Rendering**: Efficient marker updates to maintain smooth performance
- **Background Processing**: Minimized to reduce battery consumption
- **Network Usage**: Optimized WebSocket protocol to reduce data usage

## Security

- **API Key Protection**: Google Maps API key secured in native code
- **Location Data**: Only shared when necessary and with user consent
- **User Authentication**: Secure login and session management
- **Data Transmission**: Encrypted WebSocket and HTTPS connections

## Future Enhancements

Potential areas for future development:

1. **Multi-language Support**: Localization for different regions
2. **Offline Mode**: Enhanced functionality when network is unavailable
3. **Advanced Routing**: Consider traffic conditions and emergency vehicle lanes
4. **Analytics**: Usage statistics and emergency response metrics
5. **Integration with Emergency Services**: Direct communication with 911/112 systems