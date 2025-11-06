import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  company: text("company").notNull(),
  team: text("team").notNull(),
  product: text("product").notNull(),
  competitors: text("competitors").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const onboardingSessions = pgTable("onboarding_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userConcern: text("user_concern").notNull(),
  selectedServices: jsonb("selected_services").notNull(),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  company: true,
  team: true,
  product: true,
  competitors: true,
});

export const insertOnboardingSessionSchema = createInsertSchema(onboardingSessions).pick({
  userConcern: true,
  selectedServices: true,
  userId: true,
});

export const serviceRecommendationSchema = z.object({
  userInput: z.string().min(1),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertOnboardingSession = z.infer<typeof insertOnboardingSessionSchema>;
export type OnboardingSession = typeof onboardingSessions.$inferSelect;
export type ServiceRecommendationRequest = z.infer<typeof serviceRecommendationSchema>;

export interface ServiceRecommendationResponse {
  recommended_services: string[];
}

// Events Monitoring Schemas
export interface Channel {
  id: string;
  companyName: string;
  channelType: string;
  url: string;
  path: string;
  createdAt: Date;
}

export interface EventItem {
  id: string;
  channelId: string;
  companyName: string;
  title: string;
  url: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  discoveredAt: Date;
}

export interface EventsSummary {
  totalChannels: number;
  totalLinks: number;
  newEventsCount: number;
  endingSoonCount: number;
  events: {
    newIn30Days: EventItem[];
    endingSoon: EventItem[];
  };
}
