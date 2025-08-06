import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  company: text("company").notNull(),
  team: text("team").notNull(),
  product: text("product"),
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
  email: true,
  password: true,
  company: true,
  team: true,
  product: true,
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
