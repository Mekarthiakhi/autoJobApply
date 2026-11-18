import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env, validateEnvironmentSecurity } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

// Trust Railway and edge reverse proxies for accurate client IP rate limiting
app.set('trust proxy', 1);

// Security: Helmet for HTTP response security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "https:", "'unsafe-inline'"],
      fontSrc: ["'self'", "https:", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https:"],
      workerSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
    },
  },
}));

// Security: Controlled CORS policy (always permits same-origin & configured origins)
const isStrictEnv = env.NODE_ENV === 'production' || env.NODE_ENV === 'staging';
const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://localhost:5000'];

if (process.env.RAILWAY_PUBLIC_DOMAIN) {
  configuredOrigins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
}

app.use((req, res, next) => {
  const host = req.get('host');
  const sameOrigins = host ? [`${req.protocol}://${host}`, `https://${host}`, `http://${host}`] : [];

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, or server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      // Always allow same-origin requests (browsers send Origin on <script type="module" crossorigin> and POSTs)
      if (sameOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (!isStrictEnv && configuredOrigins.includes('*')) {
        return callback(null, true);
      }
      const isAllowed = configuredOrigins.some(allowed => {
        if (allowed === origin) return true;
        if (allowed.includes('*')) {
          const regex = new RegExp('^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
          return regex.test(origin);
        }
        return false;
      });
      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error(`Blocked by CORS policy: origin ${origin} is not allowed`));
    },
    credentials: true,
  })(req, res, next);
});

// Request body parser with safe payload limit
app.use(express.json({ limit: '10mb' }));

// API IP rate limiting (scoped to /api so static assets are never rate-limited)
app.use('/api', apiLimiter);

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

// Serve static frontend in production if built dist exists
const possibleDistPaths = [
  path.resolve(process.cwd(), 'public'),
  path.resolve(process.cwd(), '../frontend/dist'),
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../public'),
  path.resolve(__dirname, 'public'),
];
const staticDir = possibleDistPaths.find(p => fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html')));

if (staticDir) {
  logger.info(`📦 Serving static frontend from ${staticDir}`);
  app.use(express.static(staticDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(staticDir, 'index.html'));
  });
}

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

  // Remove auto-seeded demo account (only if still using the default seeded password)
  // so users can register fresh with their own email and password
  if (process.env.ENABLE_DEMO_SEED !== 'true') {
    try {
      const sql = await getDatabase();
      const seededUser = await sql.get<{ id: string; password_hash: string }>(
        `SELECT id, password_hash FROM users WHERE LOWER(email) = 'akhileshmekarthi28@gmail.com'`
      );
      if (seededUser) {
        const { comparePassword } = await import('./utils/encryption.js');
        const isDefaultSeededAccount = await comparePassword('TestPassword123!', seededUser.password_hash);
        if (isDefaultSeededAccount) {
          await sql.run('DELETE FROM users WHERE id = ?', [seededUser.id]);
          logger.info('🧹 Removed pre-seeded demo account akhileshmekarthi28@gmail.com for clean registration');
        }
      }
      // Also clean up static demo-seeded jobs when demo seeding is disabled
      await sql.run(
        `DELETE FROM jobs WHERE id IN ('job-react-senior-apex', 'job-react-frontend-techcorp', 'job-ui-react-fintech')`
      );
    } catch (cleanupErr) {
      logger.warn('Seeded account cleanup skipped:', cleanupErr);
    }
  } else {
    // Opt-in demo seeding only when ENABLE_DEMO_SEED=true
    try {
      const sql = await getDatabase();
      const jobRow = await sql.get<{ count: number }>('SELECT count(*) as count FROM jobs');
      if (!jobRow || jobRow.count === 0) {
        logger.info('🌱 Database has 0 jobs. Auto-seeding initial candidate profile, target jobs, and review queue...');
        const { seedAkhileshCandidate } = await import('./scripts/processAkhileshPipeline.js');
        await seedAkhileshCandidate();
      }
    } catch (seedErr) {
      logger.warn('Initial seeding skipped or encountered non-fatal error:', seedErr);
    }
  }

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
