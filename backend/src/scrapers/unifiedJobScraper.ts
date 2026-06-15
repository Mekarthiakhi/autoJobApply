import { linkedinScraper } from './linkedinScraper.js';
import { naukriScraper } from './naukriScraper.js';
import { indeedScraper } from './indeedScraper.js';
import { careerPagesScraper } from './careerPagesScraper.js';
import { logger } from '../utils/logger.js';

/**
 * Unified Job Scraper Interface
 * Coordinates job discovery across all platforms:
 * - LinkedIn
 * - Naukri
 * - Indeed
 * - CareerPages
 */

export interface JobScraperResult {
  platform: 'linkedin' | 'naukri' | 'indeed' | 'careerpages';
  status: 'success' | 'partial' | 'failed';
  jobsFound: number;
  jobs: any[];
  error?: string;
  duration: number;
}

export interface MultiPlatformApplyResult {
  platform: 'linkedin' | 'naukri' | 'indeed' | 'careerpages';
  jobUrl: string;
  result: {
    success: boolean;
    appliedAt?: Date;
    message: string;
    error?: string;
  };
}

export class UnifiedJobScraper {
  private scrapers = {
    linkedin: linkedinScraper,
    naukri: naukriScraper,
    indeed: indeedScraper,
    careerpages: careerPagesScraper,
  };

  /**
   * Search for jobs across all platforms in parallel
   */
  async searchAllPlatforms(
    keywords: string[],
    location: string = '',
    platforms: Array<'linkedin' | 'naukri' | 'indeed' | 'careerpages'> = ['linkedin', 'naukri', 'indeed', 'careerpages']
  ): Promise<JobScraperResult[]> {
    logger.info(`🔍 Starting multi-platform job search for: ${keywords.join(', ')}`);
    logger.info(`📍 Location: ${location || 'Remote'}`);
    logger.info(`🌐 Platforms: ${platforms.join(', ')}`);

    const results: JobScraperResult[] = [];

    // Search all platforms in parallel
    const searchPromises = platforms.map((platform) => this.searchPlatform(platform, keywords, location));

    const platformResults = await Promise.all(searchPromises);
    results.push(...platformResults);

    // Log summary
    const totalJobs = results.reduce((sum, r) => sum + r.jobsFound, 0);
    const successCount = results.filter((r) => r.status === 'success').length;

    logger.info(`✅ Multi-platform search completed`);
    logger.info(`📊 Summary: ${successCount}/${platforms.length} platforms successful`);
    logger.info(`📈 Total jobs found: ${totalJobs}`);

    return results;
  }

  /**
   * Search a specific platform
   */
  private async searchPlatform(
    platform: 'linkedin' | 'naukri' | 'indeed' | 'careerpages',
    keywords: string[],
    location: string
  ): Promise<JobScraperResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔄 Searching ${platform}...`);

      const scraper = this.scrapers[platform];
      const jobs = await scraper.searchJobs(keywords, location);

      const duration = Date.now() - startTime;

      const result: JobScraperResult = {
        platform,
        status: jobs.length > 0 ? 'success' : 'partial',
        jobsFound: jobs.length,
        jobs,
        duration,
      };

      logger.info(`✅ ${platform} search completed: ${jobs.length} jobs found (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ ${platform} search failed:`, error);

      return {
        platform,
        status: 'failed',
        jobsFound: 0,
        jobs: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      };
    }
  }

  /**
   * Apply to a job on a specific platform
   */
  async applyToJob(
    platform: 'linkedin' | 'naukri' | 'indeed' | 'careerpages',
    jobUrl: string,
    userProfile: any
  ): Promise<MultiPlatformApplyResult> {
    try {
      logger.info(`📤 Applying to ${platform} job: ${jobUrl}`);

      const scraper = this.scrapers[platform];
      const result = await scraper.applyToJob(jobUrl, userProfile);

      return {
        platform,
        jobUrl,
        result,
      };
    } catch (error) {
      logger.error(`❌ Failed to apply on ${platform}:`, error);

      return {
        platform,
        jobUrl,
        result: {
          success: false,
          message: `Failed to apply on ${platform}`,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Apply to jobs across multiple platforms
   */
  async applyToMultiplePlatforms(
    jobs: Array<{ platform: string; jobUrl: string }>,
    userProfile: any
  ): Promise<MultiPlatformApplyResult[]> {
    logger.info(`📤 Starting multi-platform applications for ${jobs.length} jobs`);

    const applyPromises = jobs.map((job) =>
      this.applyToJob(job.platform as any, job.jobUrl, userProfile)
    );

    const results = await Promise.all(applyPromises);

    const successCount = results.filter((r) => r.result.success).length;
    logger.info(`✅ Multi-platform applications completed: ${successCount}/${jobs.length} successful`);

    return results;
  }

  /**
   * Get platform status and capabilities
   */
  async getPlatformStatus(): Promise<
    Array<{
      platform: string;
      configured: boolean;
      capabilities: string[];
    }>
  > {
    return [
      {
        platform: 'linkedin',
        configured: !!process.env.LINKEDIN_EMAIL && !!process.env.LINKEDIN_PASSWORD,
        capabilities: ['job_search', 'auto_apply_easy_apply', 'anti_detection', 'resume_upload'],
      },
      {
        platform: 'naukri',
        configured: !!process.env.NAUKRI_EMAIL && !!process.env.NAUKRI_PASSWORD,
        capabilities: ['job_search', 'auto_apply', 'profile_matching', 'salary_filter'],
      },
      {
        platform: 'indeed',
        configured: !!process.env.INDEED_EMAIL && !!process.env.INDEED_PASSWORD,
        capabilities: ['job_search', 'auto_apply', 'advanced_search', 'salary_range'],
      },
      {
        platform: 'careerpages',
        configured: true, // CareerPages doesn't require login for basic search
        capabilities: ['job_search', 'auto_apply', 'company_profiles', 'skill_matching'],
      },
    ];
  }

  /**
   * Close all browser connections
   */
  async closeAllBrowsers(): Promise<void> {
    logger.info('🔌 Closing all browser connections...');

    try {
      await Promise.all([
        linkedinScraper.closeBrowser(),
        naukriScraper.closeBrowser(),
        indeedScraper.closeBrowser(),
        careerPagesScraper.closeBrowser(),
      ]);

      logger.info('✅ All browsers closed successfully');
    } catch (error) {
      logger.error('Error closing browsers:', error);
    }
  }

  /**
   * Get aggregated job data from all platforms
   */
  async getAggregatedJobs(
    searchResults: JobScraperResult[]
  ): Promise<
    Array<{
      id: string;
      title: string;
      company_name: string;
      platform: string;
      location: string;
      salary: string;
      skills: string[];
      url: string;
    }>
  > {
    const aggregated: Array<{
      id: string;
      title: string;
      company_name: string;
      platform: string;
      location: string;
      salary: string;
      skills: string[];
      url: string;
    }> = [];

    for (const result of searchResults) {
      for (const job of result.jobs) {
        aggregated.push({
          id: job.external_id,
          title: job.title,
          company_name: job.company_name,
          platform: result.platform,
          location: job.location,
          salary: job.salary,
          skills: job.required_skills,
          url: job.apply_url,
        });
      }
    }

    // Sort by company name for consistency
    aggregated.sort((a, b) => a.company_name.localeCompare(b.company_name));

    return aggregated;
  }

  /**
   * Get statistics across all platforms
   */
  getStatistics(searchResults: JobScraperResult[]): {
    total_jobs: number;
    by_platform: Record<string, number>;
    success_rate: number;
    average_search_time: number;
  } {
    const byPlatform: Record<string, number> = {};
    let totalJobs = 0;
    let totalTime = 0;

    for (const result of searchResults) {
      byPlatform[result.platform] = result.jobsFound;
      totalJobs += result.jobsFound;
      totalTime += result.duration;
    }

    const successRate =
      (searchResults.filter((r) => r.status === 'success').length / searchResults.length) * 100;
    const avgTime = searchResults.length > 0 ? totalTime / searchResults.length : 0;

    return {
      total_jobs: totalJobs,
      by_platform: byPlatform,
      success_rate: Math.round(successRate * 100) / 100,
      average_search_time: Math.round(avgTime),
    };
  }
}

export const unifiedJobScraper = new UnifiedJobScraper();

export default unifiedJobScraper;
