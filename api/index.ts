import express, { type Request, Response, NextFunction } from "express";
import { z } from "zod";
import dotenv from "dotenv";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import connectPg from "connect-pg-simple";
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, asc, sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

// Load environment variables
dotenv.config();

// Debug environment variables
console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET'
});

// Schema definitions (inline to avoid module import issues in Vercel)

const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const meetups = pgTable("meetups", {
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

const participations = pgTable("participations", {
  meetupId: varchar("meetup_id").notNull().references(() => meetups.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("joined"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetupId: varchar("meetup_id").notNull().references(() => meetups.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const appFeedback = pgTable("app_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  rating: integer("rating"),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
const usersRelations = relations(users, ({ many }) => ({
  hostedMeetups: many(meetups),
  participations: many(participations),
  messages: many(messages),
  feedback: many(appFeedback),
}));

const meetupsRelations = relations(meetups, ({ one, many }) => ({
  host: one(users, {
    fields: [meetups.hostId],
    references: [users.id],
  }),
  participations: many(participations),
  messages: many(messages),
}));

const participationsRelations = relations(participations, ({ one }) => ({
  meetup: one(meetups, {
    fields: [participations.meetupId],
    references: [meetups.id],
  }),
  user: one(users, {
    fields: [participations.userId],
    references: [users.id],
  }),
}));

const messagesRelations = relations(messages, ({ one }) => ({
  meetup: one(meetups, {
    fields: [messages.meetupId],
    references: [meetups.id],
  }),
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
}));

const appFeedbackRelations = relations(appFeedback, ({ one }) => ({
  user: one(users, {
    fields: [appFeedback.userId],
    references: [users.id],
  }),
}));

// Insert schemas
const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

const insertMeetupSchema = createInsertSchema(meetups).omit({
  id: true,
  createdAt: true,
}).extend({
  startAt: z.coerce.date(),
});

const insertParticipationSchema = createInsertSchema(participations).omit({
  joinedAt: true,
});

const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

const insertAppFeedbackSchema = createInsertSchema(appFeedback).omit({
  id: true,
  createdAt: true,
});

// Types
type User = {
  id: string;
  email: string;
  password: string;
  displayName: string;
  photoUrl: string | null;
  createdAt: Date;
};
type InsertUser = z.infer<typeof insertUserSchema>;
type Meetup = {
  id: string;
  hostId: string;
  title: string;
  topic: string;
  description: string;
  startAt: Date;
  location: string;
  capacity: number;
  icebreaker: string | null;
  createdAt: Date;
};
type InsertMeetup = z.infer<typeof insertMeetupSchema>;
type Participation = {
  meetupId: string;
  userId: string;
  status: string;
  joinedAt: Date;
};
type InsertParticipation = z.infer<typeof insertParticipationSchema>;
type Message = {
  id: string;
  meetupId: string;
  userId: string;
  text: string;
  createdAt: Date;
};
type InsertMessage = z.infer<typeof insertMessageSchema>;
type AppFeedback = {
  id: string;
  userId: string;
  message: string;
  rating: number | null;
  category: string | null;
  createdAt: Date;
};
type InsertAppFeedback = z.infer<typeof insertAppFeedbackSchema>;

// Database setup
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log('🔗 Attempting database connection...');
console.log('📍 Database URL host:', process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'URL_PARSE_ERROR');
console.log('🌍 Environment:', process.env.NODE_ENV);

// Try to use connection pooling URL if available, fallback to direct connection
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
console.log('🔄 Using connection string type:', process.env.POSTGRES_URL ? 'POSTGRES_URL (pooled)' : 'DATABASE_URL (direct)');

const pool = new Pool({
  connectionString: connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Add connection timeout and retry settings
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 5, // Reduce max connections for serverless
  // Additional options for better Vercel compatibility
  ...(process.env.NODE_ENV === 'production' && {
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  })
});

const db = drizzle(pool, { 
  schema: { 
    users, meetups, participations, messages, appFeedback,
    usersRelations, meetupsRelations, participationsRelations, messagesRelations, appFeedbackRelations
  } 
});

// Storage class
const PostgresSessionStore = connectPg(session);

class DatabaseStorage {
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

  async getMeetupWithHost(id: string): Promise<(Meetup & { host: User; joined_count: number }) | undefined> {
    const [result] = await db
      .select({
        meetup: meetups,
        host: users,
        joined_count: sql<number>`COALESCE(COUNT(${participations.meetupId}), 0)::int`
      })
      .from(meetups)
      .innerJoin(users, eq(meetups.hostId, users.id))
      .leftJoin(participations, and(
        eq(participations.meetupId, meetups.id),
        eq(participations.status, 'joined')
      ))
      .where(eq(meetups.id, id))
      .groupBy(meetups.id, users.id);
    
    if (!result) return undefined;
    
    return {
      ...result.meetup,
      host: result.host,
      joined_count: result.joined_count
    };
  }

  async getMeetups(): Promise<(Meetup & { joined_count: number })[]> {
    const results = await db
      .select({
        meetup: meetups,
        joined_count: sql<number>`COALESCE(COUNT(${participations.meetupId}), 0)::int`
      })
      .from(meetups)
      .leftJoin(participations, and(
        eq(participations.meetupId, meetups.id),
        eq(participations.status, 'joined')
      ))
      .where(sql`${meetups.startAt} >= NOW()`)
      .groupBy(meetups.id)
      .orderBy(asc(meetups.startAt));
    
    return results.map(r => ({
      ...r.meetup,
      joined_count: r.joined_count
    }));
  }

  async getMeetupsByTopic(topic: string): Promise<(Meetup & { joined_count: number })[]> {
    const results = await db
      .select({
        meetup: meetups,
        joined_count: sql<number>`COALESCE(COUNT(${participations.meetupId}), 0)::int`
      })
      .from(meetups)
      .leftJoin(participations, and(
        eq(participations.meetupId, meetups.id),
        eq(participations.status, 'joined')
      ))
      .where(and(
        eq(meetups.topic, topic),
        sql`${meetups.startAt} >= NOW()`
      ))
      .groupBy(meetups.id)
      .orderBy(asc(meetups.startAt));
    
    return results.map(r => ({
      ...r.meetup,
      joined_count: r.joined_count
    }));
  }

  async getMeetupsByHost(hostId: string): Promise<Meetup[]> {
    return await db
      .select()
      .from(meetups)
      .where(eq(meetups.hostId, hostId))
      .orderBy(asc(meetups.startAt));
  }

  async getJoinedMeetups(userId: string): Promise<(Meetup & { joined_count: number })[]> {
    const results = await db
      .select({
        meetup: meetups,
        joined_count: sql<number>`COALESCE(COUNT(part2.meetup_id), 0)::int`
      })
      .from(participations)
      .innerJoin(meetups, eq(participations.meetupId, meetups.id))
      .leftJoin(sql`participations part2`, and(
        sql`part2.meetup_id = ${participations.meetupId}`,
        sql`part2.status = 'joined'`
      ))
      .where(and(
        eq(participations.userId, userId),
        sql`${meetups.startAt} >= NOW()`
      ))
      .groupBy(meetups.id, participations.meetupId)
      .orderBy(asc(meetups.startAt));
    
    return results.map(r => ({
      ...r.meetup,
      joined_count: r.joined_count
    }));
  }

  async createMeetup(insertMeetup: InsertMeetup): Promise<Meetup> {
    const [meetup] = await db
      .insert(meetups)
      .values(insertMeetup)
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

const storage = new DatabaseStorage();

// Auth setup
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      password: string;
      displayName: string;
      photoUrl: string | null;
      createdAt: Date;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

const app = express();

// Middleware
app.use(express.json({
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Setup authentication with persistent sessions
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set");
}

const sessionSettings: session.SessionOptions = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: storage.sessionStore,
  cookie: {
    // Make sessions last for 1 year (365 days)
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year in milliseconds
    // Keep sessions secure but allow them to persist
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Fix sameSite configuration
  },
  // Don't destroy session on browser close
  rolling: true, // Extend session on each request
};

app.set("trust proxy", 1);
app.use(session(sessionSettings));
app.use(passport.initialize());
app.use(passport.session());

// Middleware to handle failed deserialization
app.use((req, res, next) => {
  // If user deserialization failed, clear the session
  const session = req.session as any;
  if (session && session.passport && session.passport.user && !req.user) {
    console.log('🔄 Clearing invalid session for user:', session.passport.user);
    req.logout((err) => {
      if (err) console.error('Error during logout:', err);
      next();
    });
  } else {
    next();
  }
});

passport.use(
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    const user = await storage.getUserByEmail(email);
    if (!user || !(await comparePasswords(password, user.password))) {
      return done(null, false);
    } else {
      return done(null, user);
    }
  }),
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    console.log('🔍 Attempting to deserialize user with ID:', id);
    const user = await storage.getUser(id);
    if (user) {
      console.log('✅ User deserialized successfully:', user.email);
      done(null, user);
    } else {
      console.log('❌ User not found during deserialization, clearing session');
      // User no longer exists, clear the session
      done(null, false);
    }
  } catch (error) {
    console.error('❌ Error during user deserialization:', error);
    done(error, false);
  }
});

// Auth routes
app.post("/api/register", async (req, res, next) => {
  try {
    console.log('🔐 Registration attempt for:', req.body.email);

    const existingUser = await storage.getUserByEmail(req.body.email);
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password),
    });

    req.login(user, (err) => {
      if (err) return next(err);
      
      // Set long session for new registrations (1 year by default)
      req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
      console.log('🔐 New user registered - session set to 1 year');
      
      res.status(201).json({
        ...user,
        sessionDuration: req.session.cookie.maxAge
      });
    });
  } catch (error: any) {
    console.error('❌ Registration error:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      hostname: error.hostname,
      stack: error.stack
    });
    res.status(500).json({ 
      message: "Registration failed", 
      error: error.message,
      code: error.code 
    });
  }
});

app.post("/api/login", (req, res, next) => {
  passport.authenticate("local", (err: any, user: any, info: any) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    req.login(user, (err) => {
      if (err) {
        return next(err);
      }

      // If "Remember Me" is checked, extend session duration
      if (req.body.rememberMe) {
        // Extend session to 1 year for "Remember Me"
        req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
        console.log('🔐 Remember Me enabled - session extended to 1 year');
      } else {
        // Default session duration (still long, but shorter)
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        console.log('🔐 Standard login - session set to 30 days');
      }

      res.status(200).json({
        ...user,
        sessionDuration: req.session.cookie.maxAge
      });
    });
  })(req, res, next);
});

app.post("/api/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.sendStatus(200);
  });
});

app.get("/api/user", (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  res.json(req.user);
});

console.log('✅ Authentication setup completed');

// API Routes
// Health check endpoint
app.get("/api/health", async (req, res) => {
  const baseResponse = {
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      DATABASE_HOST: process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[1]?.split('/')[0] : 'N/A',
      SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET'
    }
  };

  try {
    console.log('🔍 Health check: Testing database connection...');
    
    // Test database connection with timeout
    const dbTest = await Promise.race([
      pool.query('SELECT 1 as test'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 5000)
      )
    ]);
    
    console.log('✅ Health check: Database connection successful');
    
    res.json({
      status: "OK",
      ...baseResponse,
      database: {
        connected: true,
        testQuery: (dbTest as any).rows[0]
      }
    });
  } catch (error: any) {
    console.error('❌ Health check: Database connection failed:', error);
    
    res.status(500).json({
      status: "ERROR",
      ...baseResponse,
      database: {
        connected: false,
        error: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        hostname: error.hostname
      }
    });
  }
});

app.get("/api/meetups", async (req, res) => {
  try {
    const topic = req.query.topic as string;
    const meetups = topic 
      ? await storage.getMeetupsByTopic(topic)
      : await storage.getMeetups();
    res.json(meetups);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch meetups" });
  }
});

app.get("/api/meetups/:id", async (req, res) => {
  try {
    const meetup = await storage.getMeetupWithHost(req.params.id);
    if (!meetup) {
      return res.status(404).json({ message: "Meetup not found" });
    }
    res.json(meetup);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch meetup" });
  }
});

app.post("/api/meetups", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const meetupData = insertMeetupSchema.parse({
      ...req.body,
      hostId: req.user!.id
    });
    // Strip optional fields that may not exist in the DB yet
    const { placeName, customLocationDetails, ...safeData } = (meetupData as any);
    const meetup = await storage.createMeetup(safeData);
    res.status(201).json(meetup);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid meetup data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to create meetup" });
  }
});

// Add other API routes...
app.get("/api/meetups/:id/participants", async (req, res) => {
  try {
    const participants = await storage.getParticipationsByMeetup(req.params.id);
    res.json(participants);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch participants" });
  }
});

app.get("/api/meetups/:id/participation-count", async (req, res) => {
  try {
    const count = await storage.getParticipationCount(req.params.id);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch participation count" });
  }
});

app.post("/api/meetups/:id/join", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const meetupId = req.params.id;
    const userId = req.user!.id;

    const existing = await storage.getParticipation(meetupId, userId);
    if (existing) {
      return res.status(400).json({ message: "Already joined this meetup" });
    }

    const meetup = await storage.getMeetup(meetupId);
    if (!meetup) {
      return res.status(404).json({ message: "Meetup not found" });
    }

    const currentCount = await storage.getParticipationCount(meetupId);
    if (currentCount >= meetup.capacity) {
      return res.status(400).json({ message: "Meetup is full" });
    }

    const participation = await storage.createParticipation({
      meetupId,
      userId,
      status: "joined"
    });

    // Get updated count
    const updatedCount = await storage.getParticipationCount(meetupId);

    res.status(201).json({
      participation,
      joined_count: updatedCount,
      capacity: meetup.capacity,
      is_full: updatedCount >= meetup.capacity
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to join meetup" });
  }
});

app.delete("/api/meetups/:id/leave", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const meetupId = req.params.id;
    const userId = req.user!.id;

    const existing = await storage.getParticipation(meetupId, userId);
    if (!existing) {
      return res.status(400).json({ message: "You are not a participant in this meetup" });
    }

    // Delete the participation record
    await db
      .delete(participations)
      .where(and(
        eq(participations.meetupId, meetupId),
        eq(participations.userId, userId)
      ));

    // Get updated count
    const updatedCount = await storage.getParticipationCount(meetupId);
    const meetup = await storage.getMeetup(meetupId);

    res.status(200).json({
      message: "Successfully left the meetup",
      joined_count: updatedCount,
      capacity: meetup?.capacity || 0,
      is_full: updatedCount >= (meetup?.capacity || 0)
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to leave meetup" });
  }
});

// User routes
app.get("/api/user/joined-meetups", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const meetups = await storage.getJoinedMeetups(req.user!.id);
    res.json(meetups);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch joined meetups" });
  }
});

app.get("/api/user/hosted-meetups", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const meetups = await storage.getMeetupsByHost(req.user!.id);
    res.json(meetups);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch hosted meetups" });
  }
});

// Messages routes
app.get("/api/meetups/:id/messages", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const meetupId = req.params.id;
    const userId = req.user!.id;

    const meetup = await storage.getMeetup(meetupId);
    if (!meetup) {
      return res.status(404).json({ message: "Meetup not found" });
    }

    const isHost = meetup.hostId === userId;
    const participation = await storage.getParticipation(meetupId, userId);
    const isParticipant = !!participation;

    if (!isHost && !isParticipant) {
      return res.status(403).json({ message: "Access denied" });
    }

    const messages = await storage.getMessagesByMeetup(meetupId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

app.post("/api/meetups/:id/messages", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const meetupId = req.params.id;
    const userId = req.user!.id;

    const meetup = await storage.getMeetup(meetupId);
    if (!meetup) {
      return res.status(404).json({ message: "Meetup not found" });
    }

    const isHost = meetup.hostId === userId;
    const participation = await storage.getParticipation(meetupId, userId);
    const isParticipant = !!participation;

    if (!isHost && !isParticipant) {
      return res.status(403).json({ message: "Access denied" });
    }

    const messageData = insertMessageSchema.parse({
      ...req.body,
      meetupId,
      userId
    });

    const message = await storage.createMessage(messageData);
    res.status(201).json(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid message data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to create message" });
  }
});

// Profile routes
app.put("/api/user/profile", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const updateData = {
      displayName: req.body.displayName,
      photoUrl: req.body.photoUrl
    };

    const user = await storage.updateUser(req.user!.id, updateData);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// Feedback routes
app.post("/api/feedback", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const feedbackData = insertAppFeedbackSchema.parse({
      ...req.body,
      userId: req.user!.id
    });

    const feedback = await storage.createFeedback(feedbackData);
    res.status(201).json(feedback);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid feedback data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to submit feedback" });
  }
});

// Error handling
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  console.error('❌ API Error:', {
    url: req.url,
    method: req.method,
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
  
  res.status(status).json({ 
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default app;
