import { 
  users, meetups, participations, messages, appFeedback,
  type User, type InsertUser,
  type Meetup, type InsertMeetup,
  type Participation, type InsertParticipation,
  type Message, type InsertMessage,
  type AppFeedback, type InsertAppFeedback
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;

  // Meetups
  getMeetup(id: string): Promise<Meetup | undefined>;
  getMeetupWithHost(id: string): Promise<(Meetup & { host: User }) | undefined>;
  getMeetups(): Promise<Meetup[]>;
  getMeetupsByTopic(topic: string): Promise<Meetup[]>;
  getMeetupsByHost(hostId: string): Promise<Meetup[]>;
  getJoinedMeetups(userId: string): Promise<Meetup[]>;
  createMeetup(meetup: InsertMeetup): Promise<Meetup>;

  // Participations
  getParticipation(meetupId: string, userId: string): Promise<Participation | undefined>;
  getParticipationsByMeetup(meetupId: string): Promise<(Participation & { user: User })[]>;
  getParticipationCount(meetupId: string): Promise<number>;
  createParticipation(participation: InsertParticipation): Promise<Participation>;

  // Messages
  getMessagesByMeetup(meetupId: string): Promise<(Message & { user: User })[]>;
  createMessage(message: InsertMessage): Promise<Message & { user: User }>;

  // Feedback
  createFeedback(feedback: InsertAppFeedback): Promise<AppFeedback>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getMeetup(id: string): Promise<Meetup | undefined> {
    const [meetup] = await db.select().from(meetups).where(eq(meetups.id, id));
    return meetup || undefined;
  }

  async getMeetupWithHost(id: string): Promise<(Meetup & { host: User }) | undefined> {
    const [result] = await db
      .select()
      .from(meetups)
      .innerJoin(users, eq(meetups.hostId, users.id))
      .where(eq(meetups.id, id));
    
    if (!result) return undefined;
    
    return {
      ...result.meetups,
      host: result.users
    };
  }

  async getMeetups(): Promise<Meetup[]> {
    return await db.select().from(meetups).orderBy(asc(meetups.startAt));
  }

  async getMeetupsByTopic(topic: string): Promise<Meetup[]> {
    return await db
      .select()
      .from(meetups)
      .where(eq(meetups.topic, topic))
      .orderBy(asc(meetups.startAt));
  }

  async getMeetupsByHost(hostId: string): Promise<Meetup[]> {
    return await db
      .select()
      .from(meetups)
      .where(eq(meetups.hostId, hostId))
      .orderBy(asc(meetups.startAt));
  }

  async getJoinedMeetups(userId: string): Promise<Meetup[]> {
    const results = await db
      .select({ meetup: meetups })
      .from(participations)
      .innerJoin(meetups, eq(participations.meetupId, meetups.id))
      .where(eq(participations.userId, userId))
      .orderBy(asc(meetups.startAt));
    
    return results.map(r => r.meetup);
  }

  async createMeetup(insertMeetup: InsertMeetup): Promise<Meetup> {
    // Backward-compat: some deployments may not yet have the new columns
    // Remove optional fields that might not exist in the DB schema
    const { /* eslint-disable @typescript-eslint/no-unused-vars */
      // @ts-expect-error - these fields may exist in types but not in DB yet
      placeName, /* @ts-expect-error */ customLocationDetails, ...rest
    } = (insertMeetup as unknown) as Record<string, unknown>;

    const [meetup] = await db
      .insert(meetups)
      // Only insert known-safe columns until migrations are applied
      .values(rest as any)
      .returning();
    return meetup;
  }

  async getParticipation(meetupId: string, userId: string): Promise<Participation | undefined> {
    const [participation] = await db
      .select()
      .from(participations)
      .where(and(
        eq(participations.meetupId, meetupId),
        eq(participations.userId, userId)
      ));
    return participation || undefined;
  }

  async getParticipationsByMeetup(meetupId: string): Promise<(Participation & { user: User })[]> {
    const results = await db
      .select()
      .from(participations)
      .innerJoin(users, eq(participations.userId, users.id))
      .where(eq(participations.meetupId, meetupId))
      .orderBy(asc(participations.joinedAt));
    
    return results.map(r => ({
      ...r.participations,
      user: r.users
    }));
  }

  async getParticipationCount(meetupId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(participations)
      .where(eq(participations.meetupId, meetupId));
    
    return result[0]?.count || 0;
  }

  async createParticipation(insertParticipation: InsertParticipation): Promise<Participation> {
    const [participation] = await db
      .insert(participations)
      .values(insertParticipation)
      .returning();
    return participation;
  }

  async getMessagesByMeetup(meetupId: string): Promise<(Message & { user: User })[]> {
    const results = await db
      .select()
      .from(messages)
      .innerJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.meetupId, meetupId))
      .orderBy(asc(messages.createdAt));
    
    return results.map(r => ({
      ...r.messages,
      user: r.users
    }));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message & { user: User }> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, message.userId));
    
    return {
      ...message,
      user
    };
  }

  async createFeedback(insertFeedback: InsertAppFeedback): Promise<AppFeedback> {
    const [feedback] = await db
      .insert(appFeedback)
      .values(insertFeedback)
      .returning();
    return feedback;
  }
}

export const storage = new DatabaseStorage();
