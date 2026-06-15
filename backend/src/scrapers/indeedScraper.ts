import { chromium, Browser, Page } from 'playwright';
import { logger } from '../utils/logger.js';

interface IndeedJobData {
  title: string;
  company_name: string;
  location: string;
  salary: string;
  experience_level: string;
  required_skills: string[];
  job_description: string;
  apply_url: string;
  source: string;
  external_id: string;
  posted_date: Date;
}

interface ApplyResult {
  success: boolean;
  appliedAt?: Date;
  message: string;
  jobUrl: string;
  error?: string;
}

export class IndeedScraper {
  private browser: Browser | null = null;
  private indeedEmail: string = process.env.INDEED_EMAIL || '';
  private indeedPassword: string = process.env.INDEED_PASSWORD || '';

  /**
   * Initialize browser connection
   */
  private async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
        args: ['--disable-blink-features=AutomationControlled'],
      });
    }
    return this.browser;
  }

  /**
   * Close browser connection
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Login to Indeed (if required)
   */
  private async loginToIndeed(page: Page): Promise<boolean> {
    try {
      logger.info('🔐 Attempting Indeed login...');

      // Navigate to Indeed login
      await page.goto('https://www.indeed.com/account/login', { waitUntil: 'networkidle' });

      // Fill email
      await page.fill('input[name="email"]', this.indeedEmail);

      // Fill password
      await page.fill('input[name="password"]', this.indeedPassword);

      // Click login button
      await page.click('button[type="submit"]');

      // Wait for navigation
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });

      logger.info('✅ Indeed login successful');
      return true;
    } catch (error) {
      logger.error('Indeed login error:', error);
      return false;
    }
  }

  /**
   * Search for jobs on Indeed
   */
  async searchJobs(keywords: string[], location: string = ''): Promise<IndeedJobData[]> {
    let page: Page | null = null;

    try {
      logger.info('🔍 Starting Indeed job scraping...');

      const browser = await this.initBrowser();
      page = await browser.newPage();

      // Set user agent to avoid detection
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Build search URL
      const searchKeywords = keywords.join('+');
      const searchUrl = `https://www.indeed.com/jobs?q=${searchKeywords}&l=${location || 'Remote'}`;

      logger.info(`📍 Searching Indeed: ${searchUrl}`);

      // Navigate to search results
      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for job listings to load
      await page.waitForSelector('[data-jobsearch-jobpair="true"]', { timeout: 15000 }).catch(() => {});

      // Try alternative selector if first one fails
      let jobElements = await page.locator('[data-jobsearch-jobpair="true"]').all();
      if (jobElements.length === 0) {
        jobElements = await page.locator('.job-card-container').all();
      }

      logger.info(`📊 Found ${jobElements.length} job listings on Indeed`);

      const jobs: IndeedJobData[] = [];

      // Extract job data from each listing
      for (let i = 0; i < Math.min(jobElements.length, 20); i++) {
        try {
          const jobElement = jobElements[i];

          // Click on job to load details
          await jobElement.click().catch(() => {});
          await page.waitForTimeout(800);

          // Extract job information using Indeed selectors
          const titleElement = await page.locator('[data-testid="jobTitle"]').first();
          const title = await titleElement.textContent().catch(() => '');

          const companyElement = await page.locator('[data-testid="companyName"]').first();
          const company = await companyElement.textContent().catch(() => '');

          const locationElement = await page.locator('[data-testid="jobLocationText"]').first();
          const jobLocation = await locationElement.textContent().catch(() => '');

          // Try to extract salary
          let salary = 'Not specified';
          const salaryElement = await page.locator('[data-testid="salary-snippet"]').first();
          if (await salaryElement.isVisible().catch(() => false)) {
            salary = (await salaryElement.textContent()) || 'Not specified';
          }

          // Get job description
          const descriptionElement = await page.locator('[data-testid="jobFullDescription"], .jobsearch-JobComponent-description').first();
          const jobDescription = await descriptionElement.textContent().catch(() => '');

          // Extract skills from description
          const skillsMatch = jobDescription?.match(/(?:skills?|expertise|required|experience)[:\s]+([\w\s,&+#-.]+)/gi);
          const skills = skillsMatch
            ? skillsMatch[0]
                .split(/[,&]/)
                .map((s) => s.trim())
                .filter((s) => s)
            : [];

          // Get job ID from URL or data attribute
          const jobId = await jobElement.getAttribute('data-job-id').catch(() => '');
          const applyUrl = `https://www.indeed.com/rc/clk?jk=${jobId}`;

          const jobData: IndeedJobData = {
            title: title?.trim() || 'Unknown Position',
            company_name: company?.trim() || 'Unknown Company',
            location: jobLocation?.trim() || location || 'Remote',
            salary: salary.trim(),
            experience_level: 'Not specified',
            required_skills: skills.slice(0, 10),
            job_description: jobDescription?.trim() || '',
            apply_url: applyUrl,
            source: 'indeed',
            external_id: `indeed-${jobId}`,
            posted_date: new Date(),
          };

          jobs.push(jobData);
          logger.info(`✅ Scraped: ${jobData.title} at ${jobData.company_name}`);
        } catch (jobError) {
          logger.warn(`⚠️ Error processing individual job: ${jobError}`);
          continue;
        }
      }

      return jobs;
    } catch (error) {
      logger.error('Indeed scraping error:', error);
      return [];
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Apply to a job on Indeed using browser automation
   */
  async applyToJob(jobUrl: string, userProfile: any): Promise<ApplyResult> {
    let page: Page | null = null;

    try {
      logger.info(`📤 Starting Indeed auto-apply for: ${jobUrl}`);

      const browser = await this.initBrowser();
      page = await browser.newPage();

      // Set user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Navigate to job posting
      logger.info(`🔗 Navigating to job: ${jobUrl}`);
      await page.goto(jobUrl, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for page to load
      await page.waitForTimeout(2000);

      // Look for Apply button
      const applyButton = await page.locator('button:has-text("Apply Now"), button:has-text("Apply"), [data-testid="apply-button"]').first();
      const isApplyAvailable = await applyButton.isVisible().catch(() => false);

      if (!isApplyAvailable) {
        logger.info('ℹ️ Apply button not available for this job on Indeed');
        return {
          success: false,
          message: 'Apply button not available for this job',
          jobUrl,
          error: 'Manual application required or external link',
        };
      }

      // Click Apply button
      await applyButton.click();
      await page.waitForTimeout(1500);

      // Handle application form
      const applicationSuccess = await this.fillApplicationForm(page, userProfile);

      if (applicationSuccess) {
        logger.info(`✅ Successfully applied to job on Indeed: ${jobUrl}`);
        return {
          success: true,
          appliedAt: new Date(),
          message: 'Successfully applied to Indeed job',
          jobUrl,
        };
      } else {
        return {
          success: false,
          message: 'Failed to complete application form',
          jobUrl,
          error: 'Application form submission failed',
        };
      }
    } catch (error) {
      logger.error('Indeed auto-apply error:', error);
      return {
        success: false,
        message: `Indeed auto-apply failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        jobUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Fill Indeed application form
   */
  private async fillApplicationForm(page: Page, userProfile: any): Promise<boolean> {
    try {
      logger.info('📝 Filling Indeed application form...');

      // Wait for form to appear
      await page.waitForSelector('form, [data-testid="applicationForm"]', { timeout: 10000 }).catch(() => {});

      // Get all form fields
      const textInputs = await page.locator('input[type="text"], textarea, input[type="email"], input[type="tel"]').all();

      // Fill text fields
      for (const input of textInputs) {
        const placeholder = await input.getAttribute('placeholder');
        const name = await input.getAttribute('name');
        const type = await input.getAttribute('type');

        if (placeholder?.toLowerCase().includes('phone') || type === 'tel') {
          await input.fill(userProfile.phone || '');
        } else if (placeholder?.toLowerCase().includes('email') || type === 'email') {
          await input.fill(userProfile.email || '');
        } else if (placeholder?.toLowerCase().includes('message') || name?.toLowerCase().includes('message')) {
          await input.fill(userProfile.coverLetter || 'I am interested in this position.');
        }
      }

      // Look for submit button and click
      const submitButton = await page.locator('button:has-text("Submit"), button:has-text("Apply"), button[type="submit"]').first();

      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
        logger.info('✅ Application form submitted on Indeed');

        // Wait for confirmation
        await page.waitForTimeout(3000);

        return true;
      } else {
        logger.warn('⚠️ Submit button not found on Indeed form');
        return false;
      }
    } catch (error) {
      logger.error('Error filling Indeed application form:', error);
      return false;
    }
  }
}

export const indeedScraper = new IndeedScraper();
