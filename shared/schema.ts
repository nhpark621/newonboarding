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

export const channels = pgTable("channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // "brand_store", "social_media", etc.
  competitorId: text("competitor_id").notNull(),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  platform: text("platform"), // "cafe24", "godomall", "makeshop", "shopify", "wordpress", "generic"
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventPages = pgTable("event_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").references(() => channels.id).notNull(),
  url: text("url").notNull(),
  status: text("status").notNull().default("new"), // "new", "processing", "completed", "failed"
  discoveredAt: timestamp("discovered_at").defaultNow(),
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

export const insertChannelSchema = createInsertSchema(channels).pick({
  type: true,
  competitorId: true,
  name: true,
  baseUrl: true,
  platform: true,
});

export const insertEventPageSchema = createInsertSchema(eventPages).pick({
  channelId: true,
  url: true,
  status: true,
});

export const serviceRecommendationSchema = z.object({
  userInput: z.string().min(1),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertOnboardingSession = z.infer<typeof insertOnboardingSessionSchema>;
export type OnboardingSession = typeof onboardingSessions.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Channel = typeof channels.$inferSelect;
export type InsertEventPage = z.infer<typeof insertEventPageSchema>;
export type EventPage = typeof eventPages.$inferSelect;
export type ServiceRecommendationRequest = z.infer<typeof serviceRecommendationSchema>;

export interface ServiceRecommendationResponse {
  recommended_services: string[];
}
