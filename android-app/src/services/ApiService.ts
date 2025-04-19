/**
 * Base service for API requests
 */
export default class ApiService {
  private static BASE_URL = 'http://localhost:3000/api';
  
  /**
   * Make a GET request to the API
   * 
   * @param endpoint API endpoint
   * @param params Optional query parameters
   * @returns Promise with the response data
   */
  static async get<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error making GET request to ${endpoint}:`, error);
      throw error;
    }
  }
  
  /**
   * Make a POST request to the API
   * 
   * @param endpoint API endpoint
   * @param data Request body data
   * @returns Promise with the response data
   */
  static async post<T>(endpoint: string, data: any): Promise<T> {
    const url = this.buildUrl(endpoint);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error making POST request to ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Search for nearby hospitals
   * 
   * @param latitude Current latitude
   * @param longitude Current longitude
   * @param radius Search radius in meters
   * @returns Promise with array of hospital data
   */
  static async findNearbyHospitals(
    latitude: number, 
    longitude: number, 
    radius: number = 5000
  ): Promise<any[]> {
    try {
      const response = await this.get('/places/nearby', {
        lat: latitude.toString(), 
        lng: longitude.toString(),
        radius: radius.toString(),
        type: 'hospital'
      });
      
      return response.results || [];
    } catch (error) {
      console.error('Error finding nearby hospitals:', error);
      return [];
    }
  }
  
  /**
   * Build URL with query parameters
   * 
   * @param endpoint API endpoint
   * @param params Query parameters
   * @returns Full URL
   */
  private static buildUrl(endpoint: string, params: Record<string, string> = {}): string {
    const url = new URL(`${this.BASE_URL}${endpoint}`);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    
    return url.toString();
  }
}
