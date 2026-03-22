import { type User, type InsertUser, type OnboardingSession, type InsertOnboardingSession, type Channel, type InsertChannel, type EventPage, type InsertEventPage, type MonitoredProduct, type InsertMonitoredProduct, type PriceRecord, type InsertPriceRecord, type DiscoveredEvent, type InsertDiscoveredEvent } from "../shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createOnboardingSession(session: InsertOnboardingSession): Promise<OnboardingSession>;
  getOnboardingSessionByUserId(userId: string): Promise<OnboardingSession | undefined>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  getChannelsByType(type: string): Promise<Channel[]>;
  createEventPage(eventPage: InsertEventPage): Promise<EventPage>;
  getEventPagesByChannelId(channelId: string): Promise<EventPage[]>;
  createMonitoredProduct(product: InsertMonitoredProduct): Promise<MonitoredProduct>;
  getMonitoredProducts(): Promise<MonitoredProduct[]>;
  createPriceRecord(record: InsertPriceRecord): Promise<PriceRecord>;
  getPriceRecordsByProductId(productId: string): Promise<PriceRecord[]>;
  getAllPriceRecords(): Promise<PriceRecord[]>;
  createDiscoveredEvent(event: InsertDiscoveredEvent): Promise<DiscoveredEvent>;
  getDiscoveredEvents(): Promise<DiscoveredEvent[]>;
  getDiscoveredEventsByCompetitor(competitorName: string): Promise<DiscoveredEvent[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private onboardingSessions: Map<string, OnboardingSession>;
  private channels: Map<string, Channel>;
  private eventPages: Map<string, EventPage>;
  private monitoredProducts: Map<string, MonitoredProduct>;
  private priceRecords: Map<string, PriceRecord>;
  private discoveredEvents: Map<string, DiscoveredEvent>;

  constructor() {
    this.users = new Map();
    this.onboardingSessions = new Map();
    this.channels = new Map();
    this.eventPages = new Map();
    this.monitoredProducts = new Map();
    this.priceRecords = new Map();
    this.discoveredEvents = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      competitors: insertUser.competitors || null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async createOnboardingSession(insertSession: InsertOnboardingSession): Promise<OnboardingSession> {
    const id = randomUUID();
    const session: OnboardingSession = {
      ...insertSession,
      id,
      userId: insertSession.userId || null,
      createdAt: new Date()
    };
    this.onboardingSessions.set(id, session);
    return session;
  }

  async getOnboardingSessionByUserId(userId: string): Promise<OnboardingSession | undefined> {
    return Array.from(this.onboardingSessions.values()).find(
      (session) => session.userId === userId,
    );
  }

  async createChannel(insertChannel: InsertChannel): Promise<Channel> {
    const id = randomUUID();
    const channel: Channel = {
      ...insertChannel,
      id,
      platform: insertChannel.platform || null,
      createdAt: new Date()
    };
    this.channels.set(id, channel);
    return channel;
  }

  async getChannelsByType(type: string): Promise<Channel[]> {
    return Array.from(this.channels.values()).filter(
      (channel) => channel.type === type,
    );
  }

  async createEventPage(insertEventPage: InsertEventPage): Promise<EventPage> {
    const id = randomUUID();
    const eventPage: EventPage = {
      ...insertEventPage,
      id,
      status: insertEventPage.status || "new",
      discoveredAt: new Date()
    };
    this.eventPages.set(id, eventPage);
    return eventPage;
  }

  async getEventPagesByChannelId(channelId: string): Promise<EventPage[]> {
    return Array.from(this.eventPages.values()).filter(
      (eventPage) => eventPage.channelId === channelId,
    );
  }
  async createMonitoredProduct(insertProduct: InsertMonitoredProduct): Promise<MonitoredProduct> {
    const id = randomUUID();
    const product: MonitoredProduct = {
      ...insertProduct,
      id,
      currentPrice: insertProduct.currentPrice || null,
      imageUrl: insertProduct.imageUrl || null,
      createdAt: new Date(),
    };
    this.monitoredProducts.set(id, product);
    return product;
  }

  async getMonitoredProducts(): Promise<MonitoredProduct[]> {
    return Array.from(this.monitoredProducts.values());
  }

  async createPriceRecord(insertRecord: InsertPriceRecord): Promise<PriceRecord> {
    const id = randomUUID();
    const record: PriceRecord = {
      ...insertRecord,
      id,
      price: insertRecord.price || null,
      fetchedAt: new Date(),
    };
    this.priceRecords.set(id, record);
    return record;
  }

  async getPriceRecordsByProductId(productId: string): Promise<PriceRecord[]> {
    return Array.from(this.priceRecords.values()).filter(
      (record) => record.monitoredProductId === productId,
    );
  }

  async getAllPriceRecords(): Promise<PriceRecord[]> {
    return Array.from(this.priceRecords.values());
  }

  async createDiscoveredEvent(insertEvent: InsertDiscoveredEvent): Promise<DiscoveredEvent> {
    const id = randomUUID();
    const event: DiscoveredEvent = {
      ...insertEvent,
      id,
      startDate: insertEvent.startDate || null,
      endDate: insertEvent.endDate || null,
      benefits: insertEvent.benefits || null,
      imageUrl: insertEvent.imageUrl || null,
      createdAt: new Date(),
    };
    this.discoveredEvents.set(id, event);
    return event;
  }

  async getDiscoveredEvents(): Promise<DiscoveredEvent[]> {
    return Array.from(this.discoveredEvents.values());
  }

  async getDiscoveredEventsByCompetitor(competitorName: string): Promise<DiscoveredEvent[]> {
    return Array.from(this.discoveredEvents.values()).filter(
      (event) => event.competitorName === competitorName,
    );
  }
}

import { db } from "./db";
import { DbStorage } from "./db-storage";

export const storage: IStorage = db ? new DbStorage() : new MemStorage();
