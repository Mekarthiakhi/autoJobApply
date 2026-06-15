import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { JobRepository } from '../repositories/jobRepository.js';
import { linkedinScraper } from '../scrapers/linkedinScraper.js';
import { naukriScraper } from '../scrapers/naukriScraper.js';

const jobRepository = new JobRepository();

export function startJobDiscoveryJob() {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('🔍 Starting job discovery...');
    
    try {
      // Discover from multiple sources
      const linkedinJobs = await linkedinScraper.searchJobs(['Frontend Developer', 'React Developer']);
      const naukriJobs = await naukriScraper.searchJobs(['Frontend Developer', 'React Developer']);

      const allJobs = [...linkedinJobs, ...naukriJobs];

      for (const job of allJobs) {
        try {
          // Check if job already exists
          const existing = await jobRepository.findByExternalId(job.source, job.external_id);
          if (!existing) {
            await jobRepository.create(job);
            logger.info(`✅ New job found: ${job.title} at ${job.company_name}`);
          }
        } catch (error) {
          logger.error('Error saving job', error);
        }
      }

      logger.info(`✨ Job discovery complete. Found ${allJobs.length} jobs.`);
    } catch (error) {
      logger.error('Job discovery error', error);
    }
  });

  logger.info('✅ Job discovery scheduler started');
}
