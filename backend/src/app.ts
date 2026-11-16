import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env, validateEnvironmentSecurity } from './config/env.js';
import { initializeDatabase, closeDatabase, getDatabase, isDatabaseAvailable } from './config/database.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import jobRoutes from './routes/jobs.js';
import applicationRoutes from './routes/applications.js';
import dashboardRoutes from './routes/dashboard.js';
import resumeRoutes from './routes/resumes.js';
import reviewQueueRoutes from './routes/reviewQueue.js';
import coverLetterRoutes from './routes/coverLetters.js';
import activityLogRoutes from './routes/activityLogs.js';
import exportRoutes from './routes/exports.js';
import resumeVersionRoutes from './routes/resumeVersions.js';
import settingsRoutes from './routes/settings.js';
import agentRoutes from './routes/agents.js';
import analyticsRoutes from './routes/analytics.js';
import { startJobDiscoveryJob } from './jobs/jobDiscoveryJob.js';
import { startAIMatchingJob } from './jobs/aiMatchingJob.js';
import { startDailySummaryJob } from './jobs/dailySummaryJob.js';
import { logger } from './utils/logger.js';

const app: Express = express();

// Security: Helmet for HTTP response security headers
app.use(helmet());

// Security: Controlled CORS policy
const isStrictEnv = env.NODE_ENV === 'production' || env.NODE_ENV === 'staging';
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    if (!isStrictEnv && allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true,
}));

// Request body parser with safe payload limit
app.use(express.json({ limit: '10mb' }));

// Global IP rate limiting
app.use(apiLimiter);

// Comprehensive Health check endpoint
const healthHandler = async (_req: Request, res: Response) => {
  try {
    const isDbReady = isDatabaseAvailable();
    if (isDbReady) {
      const db = await getDatabase();
      await db.get('SELECT 1');
    }
    const mem = process.memoryUsage();
    res.json({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: isDbReady ? 'connected' : 'initializing',
      environment: env.NODE_ENV,
      memory: {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      },
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'degraded',
      error: error?.message || 'Database health check failed',
      timestamp: new Date().toISOString(),
    });
  }
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Route registration
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/review-queue', reviewQueueRoutes);
app.use('/api/cover-letters', coverLetterRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/resume-versions', resumeVersionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handler
app.use(errorHandler);

// Start server
async function startServer() {
  // Production and Staging security startup validation
  const securityCheck = validateEnvironmentSecurity();
  if (!securityCheck.isSecure) {
    if (env.NODE_ENV === 'production' || env.NODE_ENV === 'staging') {
      logger.error(`🚨 FATAL: Security validation failed in ${env.NODE_ENV} mode:`);
      securityCheck.issues.forEach(issue => logger.error(`  - ${issue}`));
      throw new Error(`${env.NODE_ENV} startup aborted due to security configuration failures: ${securityCheck.issues.join('; ')}`);
    } else {
      logger.warn('⚠️ Development Security Warning:');
      securityCheck.issues.forEach(issue => logger.warn(`  - ${issue}`));
    }
  }

  await initializeDatabase();

  // Conditionally initialize background cron jobs
  if (process.env.ENABLE_SCHEDULED_JOBS === 'true') {
    startJobDiscoveryJob();
    startAIMatchingJob();
    startDailySummaryJob();
    logger.info('⏰ Automated background cron schedulers initialized');
  }
  
  app.listen(env.PORT, () => {
    logger.info(`🚀 Server running on port ${env.PORT}`);
  });
}

// Graceful shutdown for SIGTERM and SIGINT (Ctrl+C on Windows/Linux)
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  try {
    await closeDatabase();
  } catch (err) {
    logger.error('Error closing database during shutdown', err);
  }
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
