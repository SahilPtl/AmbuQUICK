import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer } from "ws";
import { WebSocket } from "ws";
import { insertRouteSchema, insertGeofenceSchema, LOCATION_CONSTANTS, RouteGeometry, RoutePoint } from "@shared/schema";
import polyline from '@mapbox/polyline';
import webpush from "web-push";

// Haversine formula to calculate distance between two points
function calculateDistanceBetweenPoints(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  // Apply correction factor to reduce GPS disparity between devices
  return R * c * LOCATION_CONSTANTS.LOCATION_CORRECTION_FACTOR;
}

// Convert degrees to radians
function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

/**
 * Generate a realistic route between two points for visualization purposes
 * Uses Google Maps Directions API for accurate road routes when available
 * Falls back to direct line route with intermediate points if API fails
 * 
 * @param start Starting coordinates {lat, lng}
 * @param end Ending coordinates {lat, lng}
 * @returns Promise with encoded polyline string
 */
async function generateRealRoute(
  start: { lat: number; lng: number }, 
  end: { lat: number; lng: number }
): Promise<string> {
  try {
    // Try to get a realistic route from Google Maps Directions API
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key not available');
    }
    
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${start.lat},${start.lng}&destination=${end.lat},${end.lng}&mode=driving&key=${apiKey}`;
    console.log(`Getting realistic route: ${url.replace(apiKey, '[API_KEY]')}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.routes && data.routes.length > 0) {
      // Extract the encoded polyline from the response
      const encodedPolyline = data.routes[0].overview_polyline.points;
      console.log('Successfully retrieved realistic route from Google Maps');
      return encodedPolyline;
    } else {
      throw new Error(`Google Directions API error: ${data.status}`);
    }
  } catch (error) {
    console.error('Failed to get realistic route, falling back to simplified route:', error);
    // Fall back to simplified direct route
    return generateSimplifiedRoute(start, end);
  }
}

/**
 * Generate a simplified route between two points as fallback
 * Creates a direct route with intermediate points
 * 
 * @param start Starting coordinates {lat, lng}
 * @param end Ending coordinates {lat, lng}
 * @param numPoints Number of points to generate between start and end
 * @returns Encoded polyline string
 */
function generateSimplifiedRoute(
  start: { lat: number; lng: number }, 
  end: { lat: number; lng: number }, 
  numPoints: number = 5
): string {
  // Direct route with interpolated points
  const points: [number, number][] = [];
  
  // Add starting point
  points.push([start.lat, start.lng]);
  
  // Generate intermediate points along a direct line
  for (let i = 1; i <= numPoints; i++) {
    const fraction = i / (numPoints + 1);
    const lat = start.lat + (end.lat - start.lat) * fraction;
    const lng = start.lng + (end.lng - start.lng) * fraction;
    points.push([lat, lng]);
  }
  
  // Add ending point
  points.push([end.lat, end.lng]);
  
  // Encode the polyline
  return polyline.encode(points);
}

// Backward compatibility function for non-async code
function generateRoutePolyline(
  start: { lat: number; lng: number }, 
  end: { lat: number; lng: number }, 
  numPoints: number = 5
): string {
  // Just use the simplified route for now
  return generateSimplifiedRoute(start, end, numPoints);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize web-push with VAPID keys
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BPUoN5oymudkUB6fWoq8XcORNz1fJqlLNLk45yDy8U3zcR37kTbfbAu3OyXw6LhB-ZVi0kJPc_9N5kpJEE12U-c';
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'TI9KXcllgFt4qEbwKRPvVnbkd9-GRKJE_ydKGyhgjaE';
  
  webpush.setVapidDetails(
    'mailto:support@ambufree.com',
    vapidPublicKey,
    vapidPrivateKey
  );
  
  // API routes
  app.get('/api/vapid-public-key', (req, res) => {
    res.json({ key: vapidPublicKey });
  });
  
  // Store push subscription
  app.post('/api/push-subscription', async (req, res) => {
    try {
      const subscription = req.body;
      await storage.saveSubscription(subscription);
      res.status(201).json({ success: true });
    } catch (error) {
      console.error('Failed to save subscription:', error);
      res.status(500).json({ error: 'Failed to save subscription' });
    }
  });
  
  // Send notification
  app.post('/api/notify', async (req, res) => {
    try {
      const { title, body, tag, subscription } = req.body;
      
      if (!subscription) {
        const subscriptions = await storage.getAllSubscriptions();
        
        if (subscriptions.length === 0) {
          return res.status(404).json({ error: 'No subscriptions found' });
        }
        
        // Send to all subscriptions
        const promises = subscriptions.map(sub => {
          return webpush.sendNotification(
            sub, 
            JSON.stringify({
              title,
              body,
              tag,
              icon: '/logo192.png'
            })
          ).catch(error => {
            console.error('Error sending notification:', error);
            if (error.statusCode === 410) {
              // Subscription expired, remove it
              return storage.removeSubscription(sub);
            }
          });
        });
        
        await Promise.all(promises);
      } else {
        // Send to specific subscription
        await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title,
            body,
            tag,
            icon: '/logo192.png'
          })
        );
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to send notification:', error);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  });
  
  // Routes API
  app.post('/api/routes', async (req, res) => {
    try {
      const routeData = insertRouteSchema.parse(req.body);
      const route = await storage.createRoute(routeData);
      res.status(201).json(route);
    } catch (error) {
      console.error('Failed to create route:', error);
      res.status(400).json({ error: 'Invalid route data' });
    }
  });
  
  app.get('/api/routes/active', async (req, res) => {
    try {
      const route = await storage.getActiveRoute();
      if (!route) {
        return res.status(404).json({ error: 'No active route found' });
      }
      res.json(route);
    } catch (error) {
      console.error('Failed to get active route:', error);
      res.status(500).json({ error: 'Failed to get active route' });
    }
  });
  
  app.post('/api/routes/:id/complete', async (req, res) => {
    try {
      const { id } = req.params;
      const route = await storage.completeRoute(parseInt(id));
      res.json(route);
    } catch (error) {
      console.error('Failed to complete route:', error);
      res.status(500).json({ error: 'Failed to complete route' });
    }
  });
  
  // Geofences API
  app.post('/api/geofences', async (req, res) => {
    try {
      const geofenceData = insertGeofenceSchema.parse(req.body);
      const geofence = await storage.createGeofence(geofenceData);
      res.status(201).json(geofence);
    } catch (error) {
      console.error('Failed to create geofence:', error);
      res.status(400).json({ error: 'Invalid geofence data' });
    }
  });
  
  app.get('/api/routes/:id/geofences', async (req, res) => {
    try {
      const { id } = req.params;
      const geofences = await storage.getGeofencesByRouteId(parseInt(id));
      res.json(geofences);
    } catch (error) {
      console.error('Failed to get geofences:', error);
      res.status(500).json({ error: 'Failed to get geofences' });
    }
  });
  
  app.patch('/api/geofences/:id/passed', async (req, res) => {
    try {
      const { id } = req.params;
      const geofence = await storage.markGeofencePassed(parseInt(id));
      res.json(geofence);
    } catch (error) {
      console.error('Failed to update geofence:', error);
      res.status(500).json({ error: 'Failed to update geofence' });
    }
  });
  
  // OSRM Proxy - this allows us to proxy requests to an OSRM server
  // without exposing API keys or dealing with CORS
  app.get('/api/osrm/route/:coordinates', async (req, res) => {
    try {
      const { coordinates } = req.params;
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=polyline`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Failed to get route from OSRM:', error);
      res.status(500).json({ error: 'Failed to get route' });
    }
  });
  
  // Google Maps API Proxy Routes
  // Geocoding API
  app.get('/api/geocode', async (req, res) => {
    try {
      const { address } = req.query;
      if (!address) {
        return res.status(400).json({ error: 'Address parameter is required' });
      }
      
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      console.log(`Using Google Maps API Key: ${apiKey ? apiKey.substring(0, 5) + '...' : 'undefined'}`);
      
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address as string)}&key=${apiKey}`;
      console.log(`Geocoding URL: ${url.replace(apiKey || '', '[API_KEY]')}`);
      
      const response = await fetch(url);
      
      const data = await response.json();
      console.log('Google Maps API Response:', JSON.stringify(data).substring(0, 200) + '...');
      res.json(data);
    } catch (error) {
      console.error('Geocoding error:', error);
      res.status(500).json({ error: 'Failed to geocode address', details: String(error) });
    }
  });
  
  // Reverse Geocoding API
  app.get('/api/reverse-geocode', async (req, res) => {
    try {
      const { lat, lng } = req.query;
      if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude parameters are required' });
      }
      
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      console.log(`Using Google Maps API Key for reverse geocoding: ${apiKey ? apiKey.substring(0, 5) + '...' : 'undefined'}`);
      
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
      console.log(`Reverse Geocoding URL: ${url.replace(apiKey || '', '[API_KEY]')}`);
      
      const response = await fetch(url);
      
      const data = await response.json();
      console.log('Reverse Geocoding Response:', JSON.stringify(data).substring(0, 200) + '...');
      res.json(data);
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      res.status(500).json({ error: 'Failed to reverse geocode location', details: String(error) });
    }
  });
  
  // Places Nearby Search API
  app.get('/api/places/nearby', async (req, res) => {
    try {
      const { lat, lng, radius, type } = req.query;
      if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude parameters are required' });
      }
      
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      console.log(`Using Google Maps API Key for places search: ${apiKey ? apiKey.substring(0, 5) + '...' : 'undefined'}`);
      
      const searchType = type || 'hospital';
      const searchRadius = radius || 5000;
      
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${searchRadius}&type=${searchType}&key=${apiKey}`;
      console.log(`Places Search URL: ${url.replace(apiKey || '', '[API_KEY]')}`);
      
      const response = await fetch(url);
      
      const data = await response.json();
      console.log('Places Search Response:', JSON.stringify(data).substring(0, 200) + '...');
      res.json(data);
    } catch (error) {
      console.error('Places search error:', error);
      res.status(500).json({ error: 'Failed to find nearby places', details: String(error) });
    }
  });
  
  // Place Autocomplete API
  app.get('/api/places/autocomplete', async (req, res) => {
    try {
      const { input, types } = req.query;
      if (!input) {
        return res.status(400).json({ error: 'Input parameter is required' });
      }
      
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      console.log(`Using Google Maps API Key for places autocomplete: ${apiKey ? apiKey.substring(0, 5) + '...' : 'undefined'}`);
      
      const placeTypes = types || 'address';
      
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input as string)}&types=${placeTypes}&key=${apiKey}`;
      console.log(`Places Autocomplete URL: ${url.replace(apiKey || '', '[API_KEY]')}`);
      
      const response = await fetch(url);
      
      const data = await response.json();
      console.log('Places Autocomplete Response:', JSON.stringify(data).substring(0, 200) + '...');
      res.json(data);
    } catch (error) {
      console.error('Place autocomplete error:', error);
      res.status(500).json({ error: 'Failed to get place suggestions', details: String(error) });
    }
  });
  
  // Directions API
  app.get('/api/directions', async (req, res) => {
    try {
      const { origin, destination } = req.query;
      if (!origin || !destination) {
        return res.status(400).json({ error: 'Origin and destination parameters are required' });
      }
      
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      console.log(`Using Google Maps API Key for directions: ${apiKey ? apiKey.substring(0, 5) + '...' : 'undefined'}`);
      
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${apiKey}`;
      console.log(`Directions URL: ${url.replace(apiKey || '', '[API_KEY]')}`);
      
      const response = await fetch(url);
      
      const data = await response.json();
      console.log('Directions Response:', JSON.stringify(data).substring(0, 200) + '...');
      res.json(data);
    } catch (error) {
      console.error('Directions error:', error);
      res.status(500).json({ error: 'Failed to get directions', details: String(error) });
    }
  });
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Create WebSocket server for real-time position updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Maps to store client information
  const clientTypes = new Map();
  const clientAlertPreferences = new Map(); // Track if clients want to receive alerts
  const clientPositions = new Map(); // Track client positions for proximity calculations
  
  // Track client connection status to avoid sending alerts to disconnected clients
  const connectedClients = new Set();
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    const clientId = Math.random().toString(36).substring(2, 15);
    
    // Add metadata to the WebSocket instance
    (ws as any).clientId = clientId;
    (ws as any).userType = 'unknown';
    (ws as any).alertsEnabled = true; // Default to enabled
    
    // Add client to connected clients set
    connectedClients.add(clientId);
    
    // Track client alert preferences (default to enabled)
    clientAlertPreferences.set(clientId, true);
    
    // Send a welcome message
    ws.send(JSON.stringify({ 
      type: 'connected', 
      message: 'Connected to AmbuFree server',
      clientId: clientId,
      alertsEnabled: true
    }));
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received WebSocket message:', data.type);
        
        // Store client type
        if (data.userType) {
          (ws as any).userType = data.userType;
          clientTypes.set(clientId, data.userType);
          console.log(`Client ${clientId} identified as ${data.userType}`);
        }
        
        // Add client ID to outgoing messages if not present
        if (!data.clientId) {
          data.clientId = clientId;
        }
        
        // Handle position updates and track client positions for proximity calculations
        if (data.type === 'position') {
          // Store the client's last known position for proximity calculations
          if (data.position) {
            (ws as any).lastKnownPosition = data.position;
            // Also store in our Map for more reliable access
            clientPositions.set(clientId, data.position);
            console.log(`Updated position for client ${clientId}: ${JSON.stringify(data.position)}`);
          }
          
          // Broadcast position updates to all connected clients
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              const message = {
                ...data,
                timestamp: Date.now()
              };
              client.send(JSON.stringify(message));
            }
          });
        }
        
        // Handle ambulance alerts - these get high priority delivery to car users who have alerts enabled
        // AND are within the specified proximity radius
        if (data.type === 'ambulance_alert') {
          console.log('Broadcasting ambulance alert to car users with alerts enabled within 100m strict radius');
          wss.clients.forEach((client) => {
            const targetClientId = (client as any).clientId;
            const isCarUser = (client as any).userType === 'car';
            const hasAlertsEnabled = clientAlertPreferences.get(targetClientId) !== false; // Default to true if not set
            
            // Only check distance if we have both positions available
            const ambulancePosition = data.position;
            // Try to get position from Map first, fall back to WebSocket instance if needed
            const carPosition = clientPositions.get(targetClientId) || (client as any).lastKnownPosition;
            
            if (ambulancePosition && carPosition && isCarUser) {
              // Calculate distance between ambulance and car (haversine formula)
              const distance = calculateDistanceBetweenPoints(
                ambulancePosition.lat, 
                ambulancePosition.lng,
                carPosition.lat,
                carPosition.lng
              );
              
              console.log(`Distance between ambulance and car ${targetClientId}: ${Math.round(distance)}m (alert radius: ${LOCATION_CONSTANTS.EMERGENCY_ALERT_RADIUS}m)`);
              
              // Check if car is within the strict proximity radius defined in the constants
              const isInProximity = distance <= LOCATION_CONSTANTS.EMERGENCY_ALERT_RADIUS;
              
              if (client.readyState === WebSocket.OPEN && hasAlertsEnabled && isInProximity) {
                console.log(`Sending alert to car user ${targetClientId} (within range: ${Math.round(distance)}m)`);
                
                // Prepare the message data in advance
                const alertData = {
                  ...data,
                  distance: Math.round(distance), // Send the actual calculated distance
                  priority: 'high',
                  timestamp: Date.now()
                };
                
                // Use existing route geometry if provided, otherwise generate a new one
                if (data.routeGeometry) {
                  // Use route provided by ambulance driver if available
                  client.send(JSON.stringify({
                    ...alertData,
                    routeGeometry: data.routeGeometry
                  }));
                } else {
                  // Generate a realistic route between ambulance and car
                  (async () => {
                    try {
                      // Get a realistic route using Google Maps Directions API
                      const routePolyline = await generateRealRoute(ambulancePosition, carPosition);
                      
                      // Create route geometry object
                      const routeGeometry: RouteGeometry = {
                        type: 'polyline',
                        data: routePolyline
                      };
                      
                      // Send the alert with the realistic route
                      if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                          ...alertData,
                          routeGeometry
                        }));
                      }
                    } catch (error) {
                      console.error('Error generating realistic route for alert:', error);
                      
                      // Fall back to simplified route if error occurs
                      const fallbackRouteGeometry: RouteGeometry = {
                        type: 'polyline',
                        data: generateSimplifiedRoute(ambulancePosition, carPosition, 8)
                      };
                      
                      if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                          ...alertData,
                          routeGeometry: fallbackRouteGeometry
                        }));
                      }
                    }
                  })();
                }
              } else if (client.readyState === WebSocket.OPEN && isCarUser) {
                if (!hasAlertsEnabled) {
                  console.log(`Skipping alert for car user ${targetClientId} (alerts disabled)`);
                } else if (!isInProximity && !data.bypassProximityCheck) {
                  console.log(`Skipping alert for car user ${targetClientId} (outside proximity: ${Math.round(distance)}m)`);
                } else if (data.bypassProximityCheck && hasAlertsEnabled) {
                  // This is a direct broadcast alert from the driver that bypasses proximity check
                  console.log(`Sending direct broadcast alert to car user ${targetClientId} (proximity check bypassed)`);
                  
                  // Send alert with the provided route
                  client.send(JSON.stringify({
                    ...data,
                    distance: Math.round(distance), // Still send actual distance
                    priority: 'high',
                    timestamp: Date.now()
                  }));
                }
              }
            } else if (client.readyState === WebSocket.OPEN && isCarUser && hasAlertsEnabled) {
              // We're missing position data for either the car or ambulance
              // In a strict 100m proximity model, we must skip when we can't confirm proximity
              console.log(`Skipping alert for car user ${targetClientId} (cannot determine distance - missing location data)`);
              // Don't send the alert since we can't verify proximity within 100m
            }
          });
        }
        
        // Handle alert status changes
        if (data.type === 'alert_status_change') {
          console.log(`Alert status changed to: ${data.status}`);
          
          // Update the client's alert preferences
          const alertsEnabled = data.status === 'active';
          (ws as any).alertsEnabled = alertsEnabled;
          clientAlertPreferences.set(clientId, alertsEnabled);
          
          // Acknowledge the preference change
          ws.send(JSON.stringify({
            type: 'alert_status_change_confirmed',
            status: data.status,
            alertsEnabled: alertsEnabled
          }));
          
          // Optionally notify other clients (e.g., dispatch) about this change
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN && (client as any).userType === 'dispatch') {
              const notifyClientId = (client as any).clientId;
              console.log(`Notifying dispatch client ${notifyClientId} about alert preference change`);
              client.send(JSON.stringify({
                type: 'client_alert_preference_changed',
                clientId: clientId,
                userType: (ws as any).userType,
                alertsEnabled: alertsEnabled
              }));
            }
          });
        }
        
        // Handle geofence enter events
        if (data.type === 'geofence_enter') {
          // Update geofence status in storage if needed
          if (data.geofenceId) {
            storage.markGeofencePassed(data.geofenceId).catch(err => {
              console.error('Failed to mark geofence as passed:', err);
            });
          }
          
          // Broadcast to all relevant clients (ambulance and dispatch only)
          wss.clients.forEach((client) => {
            const targetClientId = (client as any).clientId;
            const userType = (client as any).userType;
            
            // Only send to ambulance and dispatch clients
            const isRelevantClient = userType === 'ambulance' || userType === 'dispatch';
            
            if (client.readyState === WebSocket.OPEN && isRelevantClient) {
              console.log(`Sending geofence notification to ${userType} client ${targetClientId}`);
              client.send(JSON.stringify({
                type: 'geofence_notification',
                geofenceId: data.geofenceId,
                geofenceName: data.geofenceName,
                distance: data.distance,
                timestamp: Date.now()
              }));
            }
          });
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log(`WebSocket client ${clientId} disconnected`);
      // Clean up all client data
      clientTypes.delete(clientId);
      clientAlertPreferences.delete(clientId);
      clientPositions.delete(clientId);
      connectedClients.delete(clientId);
      
      // Log the number of remaining connected clients
      console.log(`Remaining connected clients: ${connectedClients.size}`);
    });
  });
  
  // Simulate ambulance movement for demonstration/development
  let isSimulatingAmbulance = false;
  let simulationInterval: NodeJS.Timeout | null = null;
  let currentPosition = { lat: 51.505, lng: -0.09 };
  
  app.post('/api/simulate/start', (req, res) => {
    if (isSimulatingAmbulance) {
      return res.status(400).json({ error: 'Simulation already running' });
    }
    
    const { route } = req.body;
    if (!route || !route.length) {
      return res.status(400).json({ error: 'No route provided for simulation' });
    }
    
    isSimulatingAmbulance = true;
    let routeIndex = 0;
    
    // Give the simulated ambulance a persistent ID for tracking
    const simulatedAmbulanceId = 'simulated-ambulance-' + Date.now();
    
    // Start sending position updates every second (more frequent for smoother movement)
    simulationInterval = setInterval(() => {
      if (routeIndex < route.length) {
        currentPosition = route[routeIndex];
        routeIndex++;
        
        // Store the simulated ambulance position in the tracking map
        clientPositions.set(simulatedAmbulanceId, currentPosition);
        
        // Broadcast the position to all connected clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            const targetClientId = (client as any).clientId;
            console.log(`Sending simulated position to client ${targetClientId}`);
            
            client.send(JSON.stringify({
              type: 'position',
              userType: 'ambulance',
              clientId: simulatedAmbulanceId,
              position: currentPosition,
              timestamp: Date.now()
            }));
          }
        });
      } else {
        // End of route
        if (simulationInterval) {
          clearInterval(simulationInterval);
          isSimulatingAmbulance = false;
          
          // Clean up the simulated ambulance from the tracking map
          clientPositions.delete(simulatedAmbulanceId);
          console.log('Simulation ended, cleaned up position tracking data');
        }
      }
    }, 1000);
    
    res.json({ success: true, message: 'Simulation started' });
  });
  
  app.post('/api/simulate/stop', (req, res) => {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      isSimulatingAmbulance = false;
      
      // Clean up any simulated ambulance clients from the position tracking
      // Look for clients with IDs starting with 'simulated-ambulance-'
      // Convert entries to array first to avoid MapIterator issues
      Array.from(clientPositions.entries()).forEach(([clientId, position]) => {
        if (clientId.startsWith('simulated-ambulance-')) {
          console.log(`Cleaning up simulated ambulance client: ${clientId}`);
          clientPositions.delete(clientId);
        }
      });
    }
    
    res.json({ success: true, message: 'Simulation stopped and tracking data cleaned up' });
  });
  
  app.get('/api/simulate/status', (req, res) => {
    res.json({
      simulating: isSimulatingAmbulance,
      currentPosition: isSimulatingAmbulance ? currentPosition : null
    });
  });
  
  return httpServer;
}
