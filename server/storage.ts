import { type User, type InsertUser, type OnboardingSession, type InsertOnboardingSession } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createOnboardingSession(session: InsertOnboardingSession): Promise<OnboardingSession>;
  getOnboardingSessionByUserId(userId: string): Promise<OnboardingSession | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private onboardingSessions: Map<string, OnboardingSession>;

  constructor() {
    this.users = new Map();
    this.onboardingSessions = new Map();
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
}

export const storage = new MemStorage();
