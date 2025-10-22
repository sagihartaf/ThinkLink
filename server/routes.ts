import type { Express } from "express";
import { createServer, type Server } from "http";

export function registerRoutes(app: Express): Server {
  // All API routes removed - frontend now uses Supabase directly
  // Only keeping the server setup for health checks

  const httpServer = createServer(app);
  return httpServer;
}