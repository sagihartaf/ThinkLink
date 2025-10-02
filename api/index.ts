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

// Load environment variables
dotenv.config();

// Debug environment variables
console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET'
});

// Import schema directly
import { 
  users, meetups, participations, messages, appFeedback,
  insertMeetupSchema, insertParticipationSchema, insertMessageSchema, insertAppFeedbackSchema,
  type User, type InsertUser,
  type Meetup, type InsertMeetup,
  type Participation, type InsertParticipation,
  type Message, type InsertMessage,
  type AppFeedback, type InsertAppFeedback
} from "../shared/schema";

// Database setup
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const db = drizzle(pool, { schema: { users, meetups, participations, messages, appFeedback } });

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
    interface User extends User {}
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

// Setup authentication
const sessionSettings: session.SessionOptions = {
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  store: storage.sessionStore,
};

app.set("trust proxy", 1);
app.use(session(sessionSettings));
app.use(passport.initialize());
app.use(passport.session());

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
  const user = await storage.getUser(id);
  done(null, user);
});

// Auth routes
app.post("/api/register", async (req, res, next) => {
  try {
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
      res.status(201).json(user);
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: "Registration failed" });
  }
});

app.post("/api/login", passport.authenticate("local"), (req, res) => {
  res.status(200).json(req.user);
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
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET'
    }
  });
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
    const meetup = await storage.createMeetup(meetupData);
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

    res.status(201).json(participation);
  } catch (error) {
    res.status(500).json({ message: "Failed to join meetup" });
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
