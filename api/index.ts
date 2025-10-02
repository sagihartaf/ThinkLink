import express, { type Request, Response, NextFunction } from "express";
import { setupAuth } from "../server/auth";
import { storage } from "../server/storage";
import { insertMeetupSchema, insertParticipationSchema, insertMessageSchema, insertAppFeedbackSchema } from "../shared/schema";
import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Debug environment variables
console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET'
});

const app = express();

// Middleware
app.use(express.json({
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Setup authentication with error handling
try {
  setupAuth(app);
  console.log('✅ Authentication setup completed');
} catch (error) {
  console.error('❌ Authentication setup failed:', error);
}

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
