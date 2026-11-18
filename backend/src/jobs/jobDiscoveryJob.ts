import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { getDatabase } from '../config/database.js';
import { multiAgentPipelineOrchestrator } from '../agents/orchestratorPipeline.js';
import { jobLifecycleManager } from '../discovery/jobLifecycleManager.js';
import { companyReplyTracker } from '../services/companyReplyTracker.js';

export async function executeDiscoveryRun(): Promise<{
  usersProcessed: number;
  usersSkipped: number;
  jobsDiscovered: number;
  newJobsFound: number;
  applicationsProcessed: number;
  staleCount: number;
  expiredCount: number;
}> {
  logger.info('⏰ [CronAutoApply] Checking scheduled users (1–5 hr customizable intervals)...');
  let usersProcessed = 0;
  let usersSkipped = 0;
  let jobsDiscovered = 0;
  let applicationsProcessed = 0;

  try {
    const db = await getDatabase();
    // Fetch every user who has uploaded a resume along with their custom auto-apply schedule
    const users = await db.all<
      Array<{
        user_id: string;
        auto_apply_enabled: number | null;
        auto_apply_interval_hours: number | null;
        last_auto_apply_run_at: string | null;
      }>
    >(
      `SELECT DISTINCT r.user_id,
              ast.auto_apply_enabled,
              ast.auto_apply_interval_hours,
              ast.last_auto_apply_run_at
       FROM resumes r
       LEFT JOIN automation_settings ast ON ast.user_id = r.user_id
       WHERE r.text_content IS NOT NULL AND LENGTH(r.text_content) > 20`
    );

    const nowMs = Date.now();

    for (const row of users || []) {
      try {
        // Respect user's auto-apply toggle (defaults to ON if no settings row yet)
        if (row.auto_apply_enabled === 0) {
          usersSkipped++;
          continue;
        }

        // Respect user's custom 1–5 hour gap (with 5-min tolerance so exact hourly ticks never miss)
        const intervalHours = Math.min(5, Math.max(1, Number(row.auto_apply_interval_hours) || 1));
        if (row.last_auto_apply_run_at) {
          const lastIso = row.last_auto_apply_run_at.endsWith('Z')
            ? row.last_auto_apply_run_at
            : `${row.last_auto_apply_run_at.replace(' ', 'T')}Z`;
          const lastMs = Date.parse(lastIso);
          if (!Number.isNaN(lastMs)) {
            const elapsedMinutes = (nowMs - lastMs) / 60000;
            const requiredMinutes = intervalHours * 60 - 5;
            if (elapsedMinutes < requiredMinutes) {
              const remainingMins = Math.max(1, Math.round(intervalHours * 60 - elapsedMinutes));
              logger.info(
                `⏳ [CronAutoApply] Skipping user ${row.user_id} (schedule: every ${intervalHours}h, next run in ~${remainingMins}m)`
              );
              usersSkipped++;
              continue;
            }
          }
        }

        logger.info(`🚀 [CronAutoApply] Running scheduled pipeline for user ${row.user_id} (interval: every ${intervalHours}h)`);
        const summary = await multiAgentPipelineOrchestrator.runPipeline(row.user_id, {
          limitJobs: 10,
          skipBrowserInspection: true,
        });

        await db.run(
          `INSERT INTO automation_settings (user_id, auto_apply_enabled, auto_apply_interval_hours, last_auto_apply_run_at)
           VALUES (?, 1, ?, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id) DO UPDATE SET
             last_auto_apply_run_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP`,
          [row.user_id, intervalHours]
        );

        usersProcessed++;
        jobsDiscovered += summary.jobsDiscovered;
        applicationsProcessed += summary.draftsQueuedForReview;

        // Also check company replies in user's inbox if IMAP reply tracking is enabled
        await companyReplyTracker.checkUserReplies(row.user_id).catch(() => {});
      } catch (userErr: any) {
        logger.error(`Scheduled auto-apply pipeline failed for user ${row.user_id}`, userErr);
      }
    }

    const { staleCount, expiredCount } = await jobLifecycleManager.sweepJobLifecycle(14, 30);

    logger.info(
      `✨ [CronAutoApply] Complete: processed=${usersProcessed}, skipped=${usersSkipped}, discovered=${jobsDiscovered}, applied/queued=${applicationsProcessed}`
    );
    return {
      usersProcessed,
      usersSkipped,
      jobsDiscovered,
      newJobsFound: jobsDiscovered,
      applicationsProcessed,
      staleCount,
      expiredCount,
    };
  } catch (error: any) {
    logger.error('Fatal error during scheduled discovery & auto-apply run', error);
    return {
      usersProcessed,
      usersSkipped,
      jobsDiscovered,
      newJobsFound: jobsDiscovered,
      applicationsProcessed,
      staleCount: 0,
      expiredCount: 0,
    };
  }
}

export function startJobDiscoveryJob() {
  // Master cron ticks every hour on the hour and evaluates each user's custom 1–5 hr interval
  const schedule = process.env.DISCOVERY_CRON_SCHEDULE || '0 * * * *';
  logger.info(`⏰ Initializing Customizable Auto-Apply Cron Scheduler (1–5h per-user intervals) with master cron: "${schedule}"`);

  cron.schedule(schedule, async () => {
    await executeDiscoveryRun();
  });

  logger.info('✅ Customizable Auto-Apply cron scheduler started (supports 1h–5h user-defined gaps)');
}
