import { type User, type InsertUser, type OnboardingSession, type InsertOnboardingSession, type Channel, type InsertChannel, type EventPage, type InsertEventPage } from "@shared/schema";
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private onboardingSessions: Map<string, OnboardingSession>;
  private channels: Map<string, Channel>;
  private eventPages: Map<string, EventPage>;

  constructor() {
    this.users = new Map();
    this.onboardingSessions = new Map();
    this.channels = new Map();
    this.eventPages = new Map();
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
}

export const storage = new MemStorage();
