import { useState, useCallback, useEffect } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

// Define types
type Coordinates = {
  latitude: number;
  longitude: number;
};

type GeolocationHookResult = {
  location: Coordinates | null;
  address: string | null;
  loading: boolean;
  error: string | null;
  getLocation: () => Promise<void>;
};

/**
 * Custom hook for handling device geolocation
 * @returns GeolocationHookResult with current location and methods
 */
export default function useGeolocation(): GeolocationHookResult {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  
  // Check location permissions
  const checkPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      try {
        const status = await Geolocation.requestAuthorization('whenInUse');
        return status === 'granted';
      } catch (err) {
        setError('Failed to request location permission');
        return false;
      }
    } else if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'AmbuFree needs access to your location for ambulance alerts',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        setError('Failed to request location permission');
        return false;
      }
    }
    return false;
  }, []);
  
  // Get current location
  const getLocation = useCallback(async (): Promise<void> => {
    setError(null);
    
    // Check if we already have permission
    if (!hasPermission) {
      const granted = await checkPermissions();
      setHasPermission(granted);
      
      if (!granted) {
        setError('Location permission not granted');
        Alert.alert(
          'Location Permission Required',
          'AmbuFree needs location permission to alert you of nearby ambulances. Please enable location services in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    setLoading(true);
    
    // Get current position
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        setLoading(false);
        
        // Get address from coordinates (reverse geocoding)
        fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=YOUR_GOOGLE_MAPS_API_KEY`)
          .then(response => response.json())
          .then(data => {
            if (data.status === 'OK' && data.results && data.results.length > 0) {
              setAddress(data.results[0].formatted_address);
            }
          })
          .catch(err => {
            console.error('Error getting address:', err);
          });
      },
      (err) => {
        setError(err.message || 'Failed to get location');
        setLoading(false);
        console.error('Error getting location:', err);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );
  }, [hasPermission, checkPermissions]);
  
  // Check permissions on mount
  useEffect(() => {
    checkPermissions().then(granted => {
      setHasPermission(granted);
      if (granted) {
        getLocation();
      }
    });
  }, [checkPermissions, getLocation]);
  
  return {
    location,
    address,
    loading,
    error,
    getLocation,
  };
}