import { 
  users, type User, type InsertUser,
  routes, type Route, type InsertRoute,
  geofences, type Geofence, type InsertGeofence
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

// Subscription type for web-push
type PushSubscription = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

// Table for storing push subscriptions
const subscriptions = new Map<string, PushSubscription>();

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Route methods
  createRoute(route: InsertRoute): Promise<Route>;
  getRouteById(id: number): Promise<Route | undefined>;
  getActiveRoute(): Promise<Route | undefined>;
  completeRoute(id: number): Promise<Route | undefined>;
  
  // Geofence methods
  createGeofence(geofence: InsertGeofence): Promise<Geofence>;
  getGeofenceById(id: number): Promise<Geofence | undefined>;
  getGeofencesByRouteId(routeId: number): Promise<Geofence[]>;
  markGeofencePassed(id: number): Promise<Geofence | undefined>;
  
  // Push notification subscription methods
  saveSubscription(subscription: PushSubscription): Promise<void>;
  getSubscription(endpoint: string): Promise<PushSubscription | undefined>;
  getAllSubscriptions(): Promise<PushSubscription[]>;
  removeSubscription(subscription: PushSubscription): Promise<void>;
}

/**
 * Database storage implementation using Drizzle ORM
 */
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // Route methods
  async createRoute(insertRoute: InsertRoute): Promise<Route> {
    // Set any other routes to inactive
    await db
      .update(routes)
      .set({ active: false })
      .where(eq(routes.active, true));
    
    // Create new active route
    const [route] = await db
      .insert(routes)
      .values({
        ...insertRoute,
        active: true
      })
      .returning();
    
    return route;
  }
  
  async getRouteById(id: number): Promise<Route | undefined> {
    const [route] = await db
      .select()
      .from(routes)
      .where(eq(routes.id, id));
    
    return route || undefined;
  }
  
  async getActiveRoute(): Promise<Route | undefined> {
    const [route] = await db
      .select()
      .from(routes)
      .where(eq(routes.active, true));
    
    return route || undefined;
  }
  
  async completeRoute(id: number): Promise<Route | undefined> {
    const [updatedRoute] = await db
      .update(routes)
      .set({
        active: false,
        completedAt: new Date()
      })
      .where(eq(routes.id, id))
      .returning();
    
    return updatedRoute || undefined;
  }
  
  // Geofence methods
  async createGeofence(insertGeofence: InsertGeofence): Promise<Geofence> {
    const [geofence] = await db
      .insert(geofences)
      .values({
        ...insertGeofence,
        passed: false,
        notificationSent: false
      })
      .returning();
    
    return geofence;
  }
  
  async getGeofenceById(id: number): Promise<Geofence | undefined> {
    const [geofence] = await db
      .select()
      .from(geofences)
      .where(eq(geofences.id, id));
    
    return geofence || undefined;
  }
  
  async getGeofencesByRouteId(routeId: number): Promise<Geofence[]> {
    return db
      .select()
      .from(geofences)
      .where(eq(geofences.routeId, routeId))
      .orderBy(desc(geofences.distance)); // Sort by distance desc
  }
  
  async markGeofencePassed(id: number): Promise<Geofence | undefined> {
    const [updatedGeofence] = await db
      .update(geofences)
      .set({
        passed: true,
        notificationSent: true,
        timestamp: new Date()
      })
      .where(eq(geofences.id, id))
      .returning();
    
    return updatedGeofence || undefined;
  }
  
  // Push notification subscription methods
  // Note: We're using in-memory storage for push subscriptions since they're often temporary
  // and tied to browser sessions. For a production app, you might want to create a database table.
  async saveSubscription(subscription: PushSubscription): Promise<void> {
    subscriptions.set(subscription.endpoint, subscription);
  }
  
  async getSubscription(endpoint: string): Promise<PushSubscription | undefined> {
    return subscriptions.get(endpoint);
  }
  
  async getAllSubscriptions(): Promise<PushSubscription[]> {
    return Array.from(subscriptions.values());
  }
  
  async removeSubscription(subscription: PushSubscription): Promise<void> {
    subscriptions.delete(subscription.endpoint);
  }
}

// Initialize storage with Database implementation
export const storage = new DatabaseStorage();

// Create default user if it doesn't exist
(async () => {
  try {
    // Check if a default user exists
    const existingUser = await storage.getUserByUsername("driver");
    
    // If no default user, create one
    if (!existingUser) {
      await storage.createUser({
        username: "driver",
        password: "password", // In production, you'd hash this password
        role: "driver"
      });
      console.log("Created default user: driver");
    }
  } catch (error) {
    console.error("Error initializing storage:", error);
  }
})();
