import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { savedSearchRepository } from '../repositories/savedSearchRepository.js';
import { jobDiscoveryService } from '../services/jobDiscoveryService.js';
import { jobLifecycleManager } from '../discovery/jobLifecycleManager.js';

export async function executeDiscoveryRun(): Promise<{ newJobsFound: number; staleCount: number; expiredCount: number }> {
  logger.info('🔍 [JobDiscovery] Starting automated discovery run...');
  let totalNewJobs = 0;

  try {
    // 1. Fetch active saved searches
    const savedSearches = await savedSearchRepository.findAllActive();
    const searchTerms: Array<{ keywords: string[]; location: string }> = [];

    if (savedSearches.length > 0) {
      for (const s of savedSearches) {
        searchTerms.push({
          keywords: [s.keyword],
          location: s.location || 'Remote',
        });
      }
    } else {
      // Default fallback search terms if no user saved searches exist
      searchTerms.push({
        keywords: ['Full Stack Developer', 'Software Engineer', 'Frontend Developer'],
        location: 'Remote',
      });
    }

    // 2. Discover jobs for each search term
    for (const term of searchTerms) {
      try {
        const count = await jobDiscoveryService.discoverJobs(term.keywords);
        totalNewJobs += count;
      } catch (err: any) {
        logger.warn(`Failed discovery for search term: ${term.keywords.join(', ')}`, { error: err.message });
      }
    }

    // 3. Stale & Expired job maintenance sweep
    const { staleCount, expiredCount } = await jobLifecycleManager.sweepJobLifecycle(14, 30);

    logger.info(`✨ [JobDiscovery] Discovery run complete: ${totalNewJobs} new jobs added, ${staleCount} marked stale, ${expiredCount} expired.`);
    return { newJobsFound: totalNewJobs, staleCount, expiredCount };
  } catch (error: any) {
    logger.error('Fatal error during discovery run', error);
    return { newJobsFound: totalNewJobs, staleCount: 0, expiredCount: 0 };
  }
}

export function startJobDiscoveryJob() {
  const schedule = process.env.DISCOVERY_CRON_SCHEDULE || '0 */6 * * *';
  logger.info(`⏰ Initializing Job Discovery Scheduler with cron schedule: "${schedule}"`);

  cron.schedule(schedule, async () => {
    await executeDiscoveryRun();
  });

  logger.info('✅ Job discovery scheduler started');
}
