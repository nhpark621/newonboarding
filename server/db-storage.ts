import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  users, onboardingSessions, channels, eventPages,
  monitoredProducts, priceRecords, discoveredEvents,
  type User, type InsertUser,
  type OnboardingSession, type InsertOnboardingSession,
  type Channel, type InsertChannel,
  type EventPage, type InsertEventPage,
  type MonitoredProduct, type InsertMonitoredProduct,
  type PriceRecord, type InsertPriceRecord,
  type DiscoveredEvent, type InsertDiscoveredEvent,
} from "@shared/schema";
import type { IStorage } from "./storage";

export class DbStorage implements IStorage {
  private get db() {
    if (!db) throw new Error("Database not connected");
    return db;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await this.db.insert(users).values(insertUser).returning();
    return user;
  }

  async createOnboardingSession(insertSession: InsertOnboardingSession): Promise<OnboardingSession> {
    const [session] = await this.db.insert(onboardingSessions).values(insertSession).returning();
    return session;
  }

  async getOnboardingSessionByUserId(userId: string): Promise<OnboardingSession | undefined> {
    const [session] = await this.db
      .select()
      .from(onboardingSessions)
      .where(eq(onboardingSessions.userId, userId));
    return session;
  }

  async createChannel(insertChannel: InsertChannel): Promise<Channel> {
    const [channel] = await this.db.insert(channels).values(insertChannel).returning();
    return channel;
  }

  async getChannelsByType(type: string): Promise<Channel[]> {
    return this.db.select().from(channels).where(eq(channels.type, type));
  }

  async createEventPage(insertEventPage: InsertEventPage): Promise<EventPage> {
    const [eventPage] = await this.db.insert(eventPages).values(insertEventPage).returning();
    return eventPage;
  }

  async getEventPagesByChannelId(channelId: string): Promise<EventPage[]> {
    return this.db.select().from(eventPages).where(eq(eventPages.channelId, channelId));
  }

  async createMonitoredProduct(insertProduct: InsertMonitoredProduct): Promise<MonitoredProduct> {
    const [product] = await this.db.insert(monitoredProducts).values(insertProduct).returning();
    return product;
  }

  async getMonitoredProducts(): Promise<MonitoredProduct[]> {
    return this.db.select().from(monitoredProducts);
  }

  async createPriceRecord(insertRecord: InsertPriceRecord): Promise<PriceRecord> {
    const [record] = await this.db.insert(priceRecords).values(insertRecord).returning();
    return record;
  }

  async getPriceRecordsByProductId(productId: string): Promise<PriceRecord[]> {
    return this.db
      .select()
      .from(priceRecords)
      .where(eq(priceRecords.monitoredProductId, productId));
  }

  async getAllPriceRecords(): Promise<PriceRecord[]> {
    return this.db.select().from(priceRecords);
  }

  async createDiscoveredEvent(insertEvent: InsertDiscoveredEvent): Promise<DiscoveredEvent> {
    const [event] = await this.db.insert(discoveredEvents).values(insertEvent).returning();
    return event;
  }

  async getDiscoveredEvents(): Promise<DiscoveredEvent[]> {
    return this.db.select().from(discoveredEvents);
  }

  async getDiscoveredEventsByCompetitor(competitorName: string): Promise<DiscoveredEvent[]> {
    return this.db
      .select()
      .from(discoveredEvents)
      .where(eq(discoveredEvents.competitorName, competitorName));
  }
}
