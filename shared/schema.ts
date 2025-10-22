import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const meetups = pgTable("meetups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hostId: varchar("host_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  topic: text("topic").notNull(),
  description: text("description").notNull(),
  startAt: timestamp("start_at").notNull(),
  location: text("location").notNull(),
  capacity: integer("capacity").notNull(),
  icebreaker: text("icebreaker"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const participations = pgTable("participations", {
  meetupId: varchar("meetup_id").notNull().references(() => meetups.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("joined"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetupId: varchar("meetup_id").notNull().references(() => meetups.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appFeedback = pgTable("app_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  rating: integer("rating"),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  hostedMeetups: many(meetups),
  participations: many(participations),
  messages: many(messages),
  feedback: many(appFeedback),
}));

export const meetupsRelations = relations(meetups, ({ one, many }) => ({
  host: one(users, {
    fields: [meetups.hostId],
    references: [users.id],
  }),
  participations: many(participations),
  messages: many(messages),
}));

export const participationsRelations = relations(participations, ({ one }) => ({
  meetup: one(meetups, {
    fields: [participations.meetupId],
    references: [meetups.id],
  }),
  user: one(users, {
    fields: [participations.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  meetup: one(meetups, {
    fields: [messages.meetupId],
    references: [meetups.id],
  }),
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
}));

export const appFeedbackRelations = relations(appFeedback, ({ one }) => ({
  user: one(users, {
    fields: [appFeedback.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

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
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Meetup = typeof meetups.$inferSelect;
export type InsertMeetup = z.infer<typeof insertMeetupSchema>;
export type Participation = typeof participations.$inferSelect;
export type InsertParticipation = z.infer<typeof insertParticipationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type AppFeedback = typeof appFeedback.$inferSelect;
export type InsertAppFeedback = z.infer<typeof insertAppFeedbackSchema>;
