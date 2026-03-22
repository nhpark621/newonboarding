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

export const monitoredProducts = pgTable("monitored_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  competitorName: text("competitor_name").notNull(),
  productName: text("product_name").notNull(),
  productUrl: text("product_url").notNull(),
  currentPrice: text("current_price"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMonitoredProductSchema = createInsertSchema(monitoredProducts).pick({
  competitorName: true,
  productName: true,
  productUrl: true,
  currentPrice: true,
  imageUrl: true,
});

export const priceRecords = pgTable("price_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  monitoredProductId: varchar("monitored_product_id").references(() => monitoredProducts.id).notNull(),
  domain: text("domain").notNull(), // "official" | "naver" | "coupang"
  price: text("price"),
  productUrl: text("product_url").notNull(),
  fetchedAt: timestamp("fetched_at").defaultNow(),
});

export const insertPriceRecordSchema = createInsertSchema(priceRecords).pick({
  monitoredProductId: true,
  domain: true,
  price: true,
  productUrl: true,
});

export const discoveredEvents = pgTable("discovered_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  competitorName: text("competitor_name").notNull(),
  source: text("source").notNull(), // "official" | "naver"
  sourceUrl: text("source_url").notNull(),
  eventType: text("event_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  benefits: jsonb("benefits"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDiscoveredEventSchema = createInsertSchema(discoveredEvents).pick({
  competitorName: true,
  source: true,
  sourceUrl: true,
  eventType: true,
  title: true,
  description: true,
  startDate: true,
  endDate: true,
  benefits: true,
  imageUrl: true,
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
export type InsertMonitoredProduct = z.infer<typeof insertMonitoredProductSchema>;
export type MonitoredProduct = typeof monitoredProducts.$inferSelect;
export type InsertPriceRecord = z.infer<typeof insertPriceRecordSchema>;
export type PriceRecord = typeof priceRecords.$inferSelect;
export type InsertDiscoveredEvent = z.infer<typeof insertDiscoveredEventSchema>;
export type DiscoveredEvent = typeof discoveredEvents.$inferSelect;
export type ServiceRecommendationRequest = z.infer<typeof serviceRecommendationSchema>;

export interface ServiceRecommendationResponse {
  recommended_services: string[];
}
