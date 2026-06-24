import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { initializeDatabase, closeDatabase } from './config/database.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import jobRoutes from './routes/jobs.js';
import applicationRoutes from './routes/applications.js';
import dashboardRoutes from './routes/dashboard.js';
import resumeRoutes from './routes/resumes.js';
import { startJobDiscoveryJob } from './jobs/jobDiscoveryJob.js';
import { startAIMatchingJob } from './jobs/aiMatchingJob.js';
import { startDailySummaryJob } from './jobs/dailySummaryJob.js';
import { logger } from './utils/logger.js';

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(apiLimiter);

// Routes
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/resumes', resumeRoutes);

// Error handler
app.use(errorHandler);

// Start server
async function startServer() {
  // initializeDatabase handles its own errors gracefully
  await initializeDatabase();
  
  app.listen(env.PORT, () => {
    logger.info(`🚀 Server running on port ${env.PORT}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await closeDatabase();
  process.exit(0);
});

startServer();

export default app;
