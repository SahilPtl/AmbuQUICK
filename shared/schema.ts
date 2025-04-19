import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("driver"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Route records schema
export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  startLocation: jsonb("start_location").notNull(), // {lat, lng}
  endLocation: jsonb("end_location").notNull(), // {lat, lng}
  startAddress: text("start_address"),
  endAddress: text("end_address"),
  distance: integer("distance"), // in meters
  duration: integer("duration"), // in seconds
  routeGeometry: text("route_geometry"), // encoded polyline
  userId: integer("user_id"), // driver/creator
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  active: boolean("active").default(true),
});

// Geofence zones schema
export const geofences = pgTable("geofences", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").notNull(),
  location: jsonb("location").notNull(), // {lat, lng}
  radius: integer("radius").notNull(), // in meters
  name: text("name").notNull(),
  passed: boolean("passed").default(false),
  distance: integer("distance"), // distance from destination
  notificationSent: boolean("notification_sent").default(false),
  timestamp: timestamp("timestamp"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const insertRouteSchema = createInsertSchema(routes).pick({
  startLocation: true,
  endLocation: true,
  startAddress: true,
  endAddress: true,
  distance: true,
  duration: true,
  routeGeometry: true,
  userId: true,
});

export const insertGeofenceSchema = createInsertSchema(geofences).pick({
  routeId: true,
  location: true,
  radius: true,
  name: true,
  distance: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Route = typeof routes.$inferSelect;

export type InsertGeofence = z.infer<typeof insertGeofenceSchema>;
export type Geofence = typeof geofences.$inferSelect;

// Additional types needed for the application
export type Coordinates = {
  lat: number;
  lng: number;
  accuracy?: number; // Accuracy of the coordinates in meters
  timestamp?: number; // Timestamp when coordinates were captured
  speed?: number;     // Speed in m/s if available
  heading?: number;   // Direction of travel in degrees if available
};

export type RouteResponse = {
  geometry: string;
  distance: number;
  duration: number;
  legs: Array<any>;
  waypoints: Array<any>;
};

export type GeofenceStatus = 'upcoming' | 'active' | 'passed';

// Route visualization types
export type RoutePoint = [number, number]; // [lat, lng]
export type RouteGeometry = {
  type: 'polyline' | 'geojson';
  data: string; // Either encoded polyline or GeoJSON string
};

// Constants for location tracking
export const LOCATION_CONSTANTS = {
  GEOFENCE_DETECTION_RADIUS: 0.3, // 30 centimeters for precise testing
  HIGH_ACCURACY_THRESHOLD: 10,    // High accuracy is considered <= 10 meters
  LOCATION_CORRECTION_FACTOR: 0.4, // Reduce reported distance disparity by 60%
  EMERGENCY_ALERT_RADIUS: 100,    // Maximum radius in meters for emergency alerts
  ROUTE_ANIMATION_SPEED: 1000,    // Animation speed for route polyline in ms
  ROUTE_COLOR: '#FF0000',         // Red color for ambulance route
  ROUTE_WEIGHT: 4,                // Line thickness for route
  ROUTE_DASH_ARRAY: '6,4'         // Dashed line pattern for route
};
