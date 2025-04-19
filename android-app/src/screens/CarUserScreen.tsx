import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  SafeAreaView, 
  Switch, 
  Text, 
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import NativeMapView from '../components/NativeMapView';
import EmergencyAlertModal from '../components/EmergencyAlertModal';
import useWebSocket from '../hooks/useWebSocket';
import useGeolocation from '../hooks/useGeolocation';
import { calculateDistance } from '../utils/commonUtils';

// Define types
type AmbulanceInfo = {
  id: string;
  distance: number;
  eta: number;
  location: {
    lat: number;
    lng: number;
  };
};

const CarUserScreen: React.FC = () => {
  // State
  const [alertMode, setAlertMode] = useState<boolean>(true);
  const [showAmbulanceAlert, setShowAmbulanceAlert] = useState<boolean>(false);
  const [ambulanceInfo, setAmbulanceInfo] = useState<AmbulanceInfo | null>(null);
  
  // Get location updates using our custom hook
  const { location, getLocation } = useGeolocation();
  
  // Configure WebSocket connection
  const wsUrl = 'wss://ambu-free.replit.app/ws';
  const { 
    isConnected, 
    send, 
    lastMessage, 
    connect, 
    disconnect 
  } = useWebSocket(true, wsUrl);
  
  // Connect to WebSocket on mount
  useEffect(() => {
    if (!isConnected) {
      connect(wsUrl);
    }
    
    // Clean up on unmount
    return () => {
      disconnect();
    };
  }, []);
  
  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;
    
    try {
      const data = JSON.parse(lastMessage);
      
      // Handle ambulance_alert message
      if (data.type === 'ambulance_alert') {
        const { id, location: ambulanceLocation } = data.data;
        
        if (location && alertMode) {
          // Calculate distance between car and ambulance
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            ambulanceLocation.lat,
            ambulanceLocation.lng
          );
          
          // Calculate ETA (roughly) - assuming average speed of 50 km/h
          // 50 km/h = 13.89 m/s
          const eta = distance / 13.89;
          
          // Create ambulance info object
          const newAmbulanceInfo: AmbulanceInfo = {
            id,
            distance,
            eta,
            location: ambulanceLocation,
          };
          
          // Update state
          setAmbulanceInfo(newAmbulanceInfo);
          setShowAmbulanceAlert(true);
        }
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, [lastMessage, location, alertMode]);
  
  // Send location updates to server
  useEffect(() => {
    if (isConnected && location) {
      send('position', {
        latitude: location.latitude,
        longitude: location.longitude,
        userType: 'car',
      });
    }
  }, [isConnected, location, send]);
  
  // Request location on mount
  useEffect(() => {
    getLocation();
    
    // Set up interval for location updates
    const intervalId = setInterval(() => {
      getLocation();
    }, 5000);
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, []);
  
  // Handle alert mode toggle
  const handleToggleAlertMode = () => {
    const newAlertMode = !alertMode;
    setAlertMode(newAlertMode);
    
    // Show confirmation alert
    if (newAlertMode) {
      Alert.alert(
        'Alerts Enabled',
        'You will now receive alerts when ambulances are nearby.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Alerts Disabled',
        'You will no longer receive alerts when ambulances are nearby.',
        [{ text: 'OK' }]
      );
    }
  };
  
  // Handle position updates from map
  const handlePositionUpdate = (position: { latitude: number; longitude: number }) => {
    if (isConnected) {
      send('position', {
        latitude: position.latitude,
        longitude: position.longitude,
        userType: 'car',
      });
    }
  };
  
  // Close emergency alert modal
  const handleCloseAlert = () => {
    setShowAmbulanceAlert(false);
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Map container */}
      <View style={styles.mapContainer}>
        <NativeMapView
          ambulancePosition={ambulanceInfo ? {
            latitude: ambulanceInfo.location.lat,
            longitude: ambulanceInfo.location.lng,
          } : undefined}
          onPositionUpdate={handlePositionUpdate}
        />
      </View>
      
      {/* Alert mode toggle */}
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>
          Emergency Alerts: {alertMode ? 'ON' : 'OFF'}
        </Text>
        <Switch
          value={alertMode}
          onValueChange={handleToggleAlertMode}
          trackColor={{ false: '#767577', true: '#E53935' }}
          thumbColor={alertMode ? '#f4f3f4' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
        />
      </View>
      
      {/* Connection status indicator */}
      <View style={styles.statusContainer}>
        <View 
          style={[
            styles.statusIndicator, 
            isConnected ? styles.statusConnected : styles.statusDisconnected
          ]} 
        />
        <Text style={styles.statusText}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
      </View>
      
      {/* Emergency alert modal */}
      <EmergencyAlertModal
        isVisible={showAmbulanceAlert}
        onClose={handleCloseAlert}
        ambulanceInfo={ambulanceInfo}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mapContainer: {
    flex: 1,
  },
  toggleContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    right: 16,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    ...Platform.select({
      android: {
        elevation: 4,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
    }),
  },
  toggleLabel: {
    marginRight: 8,
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
    ...Platform.select({
      android: {
        elevation: 4,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
    }),
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusConnected: {
    backgroundColor: '#4CAF50',
  },
  statusDisconnected: {
    backgroundColor: '#F44336',
  },
  statusText: {
    fontSize: 12,
  },
});

export default CarUserScreen;