import express, { type Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { Pool } from 'pg';

// Load environment variables
dotenv.config();

// Debug environment variables
console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
});

// Database setup
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is required. Please set it in your .env file.",
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
  connectionTimeoutMillis: 15000
});

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check endpoint
app.get("/api/health", async (req, res) => {
  const baseResponse = {
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      DATABASE_HOST: process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[1]?.split('/')[0] : 'N/A'
    }
  };

  try {
    console.log('🔍 Health check: Testing database connection...');
    
    // Test database connection with timeout
    const dbTest = await Promise.race([
      pool.query('SELECT NOW() as current_time'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 5000)
      )
    ]);

    console.log('✅ Database connection successful');
    
    res.json({
      ...baseResponse,
      status: 'healthy',
      database: {
        connected: true,
        current_time: (dbTest as any).rows[0].current_time
      }
    });
  } catch (error: any) {
    console.error('❌ Health check failed:', error.message);
    
    res.status(503).json({
      ...baseResponse,
      status: 'unhealthy',
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

// All API routes removed - frontend now uses Supabase directly

// Error handling
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  console.error('❌ API Error:', {
    url: req.url,
    method: req.method,
    status,
    message,
    stack: err.stack
  });
  
  res.status(status).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

export default app;