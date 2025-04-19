import Geolocation from '@react-native-community/geolocation';

/**
 * Service for handling location-related functionality
 */
export default class LocationService {
  /**
   * Get the current device location
   * @returns Promise with location coordinates
   */
  static getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting position:', error);
          reject(error);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 10000 
        }
      );
    });
  }

  /**
   * Watch position changes with continuous updates
   * @param onPositionChange Callback function for position updates
   * @returns Watch ID to clear the watcher
   */
  static watchPosition(
    onPositionChange: (position: { latitude: number; longitude: number }) => void,
    onError?: (error: any) => void
  ): number {
    return Geolocation.watchPosition(
      (position) => {
        onPositionChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Watch position error:', error);
        if (onError) {
          onError(error);
        }
      },
      { 
        enableHighAccuracy: true, 
        distanceFilter: 10, // minimum distance in meters between position updates
        interval: 5000, // minimum time in milliseconds between position updates
      }
    );
  }

  /**
   * Clear the position watcher
   * @param watchId Watch ID returned by watchPosition
   */
  static clearWatch(watchId: number): void {
    Geolocation.clearWatch(watchId);
  }

  /**
   * Get the address from coordinates (Geocoding)
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @returns Promise with the address string
   */
  static async getAddressFromCoordinates(
    latitude: number,
    longitude: number
  ): Promise<string | null> {
    try {
      // This method would typically use Google's Geocoding API or similar
      // For now, return a placeholder as the Google Maps API key is not configured
      return `Location at ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      
      /* Actual implementation would be something like:
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
      return null;
      */
    } catch (error) {
      console.error('Error getting address:', error);
      return null;
    }
  }

  /**
   * Get coordinates from an address (Reverse Geocoding)
   * @param address Address string
   * @returns Promise with coordinates
   */
  static async getCoordinatesFromAddress(
    address: string
  ): Promise<{ latitude: number; longitude: number } | null> {
    try {
      // This method would typically use Google's Geocoding API or similar
      // For now, return null as the Google Maps API key is not configured
      return null;
      
      /* Actual implementation would be something like:
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          latitude: location.lat,
          longitude: location.lng,
        };
      }
      return null;
      */
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }
}
