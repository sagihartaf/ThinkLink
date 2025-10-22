import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table removed - now using Supabase auth.users and public.profiles

export const meetups = pgTable("meetups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hostId: varchar("host_id").notNull(), // References auth.users(id) - no foreign key constraint
  title: text("title").notNull(),
  topic: text("topic").notNull(),
  description: text("description").notNull(),
  startAt: timestamp("start_at").notNull(),
  location: text("location").notNull(),
  placeName: text("place_name"),
  customLocationDetails: text("custom_location_details"),
  capacity: integer("capacity").notNull(),
  icebreaker: text("icebreaker"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const participations = pgTable("participations", {
  meetupId: varchar("meetup_id").notNull().references(() => meetups.id),
  userId: varchar("user_id").notNull(), // References auth.users(id) - no foreign key constraint
  status: text("status").notNull().default("joined"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetupId: varchar("meetup_id").notNull().references(() => meetups.id),
  userId: varchar("user_id").notNull(), // References auth.users(id) - no foreign key constraint
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appFeedback = pgTable("app_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // References auth.users(id) - no foreign key constraint
  message: text("message").notNull(),
  rating: integer("rating"),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations - removed users relations since we now use Supabase auth.users

// Insert schemas - removed user schemas since we now use Supabase auth.users
export const insertMeetupSchema = createInsertSchema(meetups).omit({
  id: true,
  createdAt: true,
}).extend({
  startAt: z.coerce.date(),
});

export const insertParticipationSchema = createInsertSchema(participations).omit({
  joinedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertAppFeedbackSchema = createInsertSchema(appFeedback).omit({
  id: true,
  createdAt: true,
});

// Types
export type Meetup = typeof meetups.$inferSelect;
export type InsertMeetup = z.infer<typeof insertMeetupSchema>;
export type Participation = typeof participations.$inferSelect;
export type InsertParticipation = z.infer<typeof insertParticipationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type AppFeedback = typeof appFeedback.$inferSelect;
export type InsertAppFeedback = z.infer<typeof insertAppFeedbackSchema>;
