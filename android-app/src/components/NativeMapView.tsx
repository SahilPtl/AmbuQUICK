import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import MapView, { 
  Marker, 
  Polyline, 
  Circle, 
  PROVIDER_GOOGLE,
  LatLng,
  MarkerAnimated,
  Region
} from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Define types for our component props
interface NativeMapViewProps {
  ambulancePosition?: LatLng;
  route?: LatLng[];
  geofences?: Geofence[];
  onPositionUpdate?: (position: LatLng) => void;
}

// Define the geofence type
interface Geofence {
  id: string;
  location: LatLng;
  radius: number;
  passed: boolean;
  active: boolean;
}

const NativeMapView: React.FC<NativeMapViewProps> = ({
  ambulancePosition,
  route,
  geofences = [],
  onPositionUpdate,
}) => {
  // Refs for map and markers
  const mapRef = useRef<MapView>(null);
  const ambulanceMarkerRef = useRef<MarkerAnimated>(null);
  
  // State for user location and permissions
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(false);
  
  // Get location permissions on mount
  useEffect(() => {
    requestLocationPermission();
  }, []);
  
  // Request location permissions for Android
  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      try {
        const granted = await Geolocation.requestAuthorization('whenInUse');
        if (granted === 'granted') {
          setHasLocationPermission(true);
          getCurrentLocation();
        }
      } catch (error) {
        console.error('Error requesting iOS location permission:', error);
      }
    } else {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'AmbuFree Location Permission',
            message: 'AmbuFree needs access to your location to show nearby ambulances.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasLocationPermission(true);
          getCurrentLocation();
        }
      } catch (error) {
        console.error('Error requesting Android location permission:', error);
      }
    }
  };
  
  // Get the current device location
  const getCurrentLocation = () => {
    if (!hasLocationPermission) return;
    
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { latitude, longitude };
        setUserLocation(newLocation);
        
        // Center map on user location
        animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        
        // Notify parent component
        if (onPositionUpdate) {
          onPositionUpdate(newLocation);
        }
      },
      (error) => {
        console.error('Error getting current position:', error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };
  
  // Function to animate map to a specific region
  const animateToRegion = (region: Region) => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(region, 500);
    }
  };
  
  // Center map on ambulance position when it changes
  useEffect(() => {
    if (ambulancePosition && mapRef.current) {
      // Don't animate - just update the marker position directly
      if (ambulanceMarkerRef.current) {
        ambulanceMarkerRef.current.setNativeProps({
          coordinate: ambulancePosition
        });
      }
    }
  }, [ambulancePosition]);
  
  // Handle route updates
  useEffect(() => {
    if (route && route.length > 1 && mapRef.current) {
      // Fit map to route bounds
      mapRef.current.fitToCoordinates(route, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: false,
      });
    }
  }, [route]);
  
  // Center map on user location
  const handleCenterMap = () => {
    if (ambulancePosition) {
      animateToRegion({
        latitude: ambulancePosition.latitude,
        longitude: ambulancePosition.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } else if (userLocation) {
      animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };
  
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE} // Use Google Maps for better performance
        initialRegion={{
          latitude: 51.505,
          longitude: -0.09,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        mapType="standard"
      >
        {/* Ambulance marker */}
        {ambulancePosition && (
          <MarkerAnimated
            ref={ambulanceMarkerRef}
            coordinate={ambulancePosition}
            title="Ambulance"
            description="Emergency Vehicle"
            image={require('../assets/ambulance-marker.png')}
            zIndex={1000}
          />
        )}
        
        {/* Route polyline */}
        {route && route.length > 1 && (
          <Polyline
            coordinates={route}
            strokeColor="#1976D2"
            strokeWidth={4}
            zIndex={2}
          />
        )}
        
        {/* Route start and end markers */}
        {route && route.length > 1 && (
          <>
            <Marker
              coordinate={route[0]}
              title="Start"
              pinColor="green"
              zIndex={3}
            />
            <Marker
              coordinate={route[route.length - 1]}
              title="Destination"
              pinColor="red"
              zIndex={3}
            />
          </>
        )}
        
        {/* Geofence circles */}
        {geofences.map((geofence) => {
          // Determine color based on status
          let color = '#1976D2'; // default blue
          let fillOpacity = 0.1;
          
          if (geofence.passed) {
            color = '#43A047'; // green
          } else if (geofence.active) {
            color = '#FFC107'; // yellow
            fillOpacity = 0.2;
          }
          
          return (
            <Circle
              key={geofence.id}
              center={geofence.location}
              radius={geofence.radius}
              strokeColor={color}
              fillColor={`${color}${Math.round(fillOpacity * 255).toString(16)}`}
              strokeWidth={2}
              zIndex={1}
            />
          );
        })}
      </MapView>
      
      {/* Map controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={handleCenterMap}
        >
          <Icon name="my-location" size={24} color="#e53935" />
        </TouchableOpacity>
      </View>
      
      {/* ETA and distance info panel */}
      <View style={styles.infoPanel}>
        <Text style={styles.infoHeader}>ETA</Text>
        <Text style={styles.infoValue}>-- min</Text>
        <Text style={styles.infoSubtext}>Distance: --</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  controls: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  controlButton: {
    backgroundColor: 'white',
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    marginBottom: 10,
  },
  infoPanel: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  infoHeader: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  infoSubtext: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
});

export default NativeMapView;