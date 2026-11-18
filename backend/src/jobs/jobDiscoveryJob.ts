import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { getDatabase } from '../config/database.js';
import { multiAgentPipelineOrchestrator } from '../agents/orchestratorPipeline.js';
import { jobLifecycleManager } from '../discovery/jobLifecycleManager.js';
import { companyReplyTracker } from '../services/companyReplyTracker.js';

export async function executeDiscoveryRun(): Promise<{ usersProcessed: number; jobsDiscovered: number; newJobsFound: number; applicationsProcessed: number; staleCount: number; expiredCount: number }> {
  logger.info('⏰ [HourlyAutoApply] Starting scheduled 1-hour multi-agent discovery & auto-apply run...');
  let usersProcessed = 0;
  let jobsDiscovered = 0;
  let applicationsProcessed = 0;

  try {
    const db = await getDatabase();
    // Run autonomous pipeline for every user who has uploaded a resume
    const users = await db.all<Array<{ user_id: string }>>(
      `SELECT DISTINCT user_id FROM resumes WHERE text_content IS NOT NULL AND LENGTH(text_content) > 20`
    );

    for (const row of users || []) {
      try {
        const summary = await multiAgentPipelineOrchestrator.runPipeline(row.user_id, {
          limitJobs: 10,
          skipBrowserInspection: true,
        });
        usersProcessed++;
        jobsDiscovered += summary.jobsDiscovered;
        applicationsProcessed += summary.draftsQueuedForReview;
        // Also check company replies in user's inbox if IMAP reply tracking is enabled
        await companyReplyTracker.checkUserReplies(row.user_id).catch(() => {});
      } catch (userErr: any) {
        logger.error(`Hourly auto-apply pipeline failed for user ${row.user_id}`, userErr);
      }
    }

    const { staleCount, expiredCount } = await jobLifecycleManager.sweepJobLifecycle(14, 30);

    logger.info(`✨ [HourlyAutoApply] Complete: users=${usersProcessed}, discovered=${jobsDiscovered}, applied/queued=${applicationsProcessed}`);
    return { usersProcessed, jobsDiscovered, newJobsFound: jobsDiscovered, applicationsProcessed, staleCount, expiredCount };
  } catch (error: any) {
    logger.error('Fatal error during hourly discovery & auto-apply run', error);
    return { usersProcessed, jobsDiscovered, newJobsFound: jobsDiscovered, applicationsProcessed, staleCount: 0, expiredCount: 0 };
  }
}

export function startJobDiscoveryJob() {
  // Default: runs automatically every 1 hour on the hour
  const schedule = process.env.DISCOVERY_CRON_SCHEDULE || '0 * * * *';
  logger.info(`⏰ Initializing Hourly Job Discovery & Auto-Apply Scheduler with cron: "${schedule}"`);

  cron.schedule(schedule, async () => {
    await executeDiscoveryRun();
  });

  logger.info('✅ Hourly job discovery & auto-apply scheduler started (runs every 1 hour)');
}
