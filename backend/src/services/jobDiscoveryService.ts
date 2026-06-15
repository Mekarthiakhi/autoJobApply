import { JobRepository } from '../repositories/jobRepository.js';
import { logger } from '../utils/logger.js';
import { linkedinScraper } from '../scrapers/linkedinScraper.js';
import { naukriScraper } from '../scrapers/naukriScraper.js';
import { indeedScraper } from '../scrapers/indeedScraper.js';

const jobRepository = new JobRepository();

export class JobDiscoveryService {
  async discoverJobs(keywords: string[]) {
    try {
      logger.info('🔍 Starting job discovery with keywords:', keywords);

      const [linkedinJobs, naukriJobs, indeedJobs] = await Promise.all([
        linkedinScraper.searchJobs(keywords),
        naukriScraper.searchJobs(keywords),
        indeedScraper.searchJobs(keywords),
      ]);

      const allJobs = [...linkedinJobs, ...naukriJobs, ...indeedJobs];
      let newJobsCount = 0;

      for (const job of allJobs) {
        try {
          const existing = await jobRepository.findByExternalId(job.source, job.external_id);
          if (!existing) {
            await jobRepository.create(job);
            newJobsCount++;
          }
        } catch (error) {
          logger.error('Error saving job:', error);
        }
      }

      logger.info(`✅ Job discovery complete. Found ${newJobsCount} new jobs`);
      return newJobsCount;
    } catch (error) {
      logger.error('Job discovery service error:', error);
      return 0;
    }
  }
}

export const jobDiscoveryService = new JobDiscoveryService();
