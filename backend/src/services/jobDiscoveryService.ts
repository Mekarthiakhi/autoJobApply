import { jobRepository } from '../repositories/jobRepository.js';
import { logger } from '../utils/logger.js';
import { linkedinScraper } from '../scrapers/linkedinScraper.js';
import { naukriScraper } from '../scrapers/naukriScraper.js';
import { indeedScraper } from '../scrapers/indeedScraper.js';
import { jobNormalizer } from '../discovery/jobNormalizer.js';
import { jobDeduplicator } from '../discovery/jobDeduplicator.js';

export class JobDiscoveryService {
  async discoverJobs(keywords: string[], location: string = 'Remote'): Promise<number> {
    try {
      logger.info('🔍 Starting multi-platform job discovery with keywords:', keywords);

      const [linkedinJobs, naukriJobs, indeedJobs] = await Promise.allSettled([
        linkedinScraper.searchJobs(keywords, location),
        naukriScraper.searchJobs(keywords, location),
        indeedScraper.searchJobs(keywords, location),
      ]);

      const rawJobs: any[] = [];
      if (linkedinJobs.status === 'fulfilled') rawJobs.push(...linkedinJobs.value);
      if (naukriJobs.status === 'fulfilled') rawJobs.push(...naukriJobs.value);
      if (indeedJobs.status === 'fulfilled') rawJobs.push(...indeedJobs.value);

      // 1. Normalize all incoming jobs
      const normalizedJobs = rawJobs.map(r => jobNormalizer.normalize(r));

      // 2. Intra-batch fuzzy deduplication
      const { uniqueJobs } = jobDeduplicator.deduplicateBatch(normalizedJobs);

      let newJobsCount = 0;

      // 3. Upsert into database
      for (const job of uniqueJobs) {
        try {
          const existing = await jobRepository.findByExternalId(job.source, job.externalId);
          await jobRepository.upsertNormalizedJob(job);
          if (!existing) {
            newJobsCount++;
          }
        } catch (error) {
          logger.error('Error upserting job:', error);
        }
      }

      logger.info(`✅ Job discovery complete. Ingested ${uniqueJobs.length} unique jobs (${newJobsCount} brand new)`);
      return newJobsCount;
    } catch (error) {
      logger.error('Job discovery service error:', error);
      return 0;
    }
  }
}

export const jobDiscoveryService = new JobDiscoveryService();
