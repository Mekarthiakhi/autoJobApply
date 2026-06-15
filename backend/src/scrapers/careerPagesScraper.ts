import { chromium, Browser, Page } from 'playwright';
import { logger } from '../utils/logger.js';

interface CareerPagesJobData {
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

export class CareerPagesScraper {
  private browser: Browser | null = null;

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
   * Search for jobs on CareerPages
   */
  async searchJobs(keywords: string[], location: string = ''): Promise<CareerPagesJobData[]> {
    let page: Page | null = null;

    try {
      logger.info('🔍 Starting CareerPages job scraping...');

      const browser = await this.initBrowser();
      page = await browser.newPage();

      // Set user agent to avoid detection
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Build search URL
      const searchKeywords = keywords.join('+');
      const searchUrl = `https://www.careerpages.com/jobs?search=${searchKeywords}&location=${location || 'India'}`;

      logger.info(`📍 Searching CareerPages: ${searchUrl}`);

      // Navigate to search results
      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for job listings to load
      await page.waitForSelector('[data-testid="jobListing"], .job-listing, [class*="jobCard"]', { timeout: 15000 }).catch(() => {});

      // Get all job listings
      let jobElements = await page.locator('[data-testid="jobListing"]').all();
      if (jobElements.length === 0) {
        jobElements = await page.locator('.job-listing').all();
      }
      if (jobElements.length === 0) {
        jobElements = await page.locator('[class*="jobCard"]').all();
      }

      logger.info(`📊 Found ${jobElements.length} job listings on CareerPages`);

      const jobs: CareerPagesJobData[] = [];

      // Extract job data from each listing
      for (let i = 0; i < Math.min(jobElements.length, 20); i++) {
        try {
          const jobElement = jobElements[i];

          // Click on job to load details
          await jobElement.click().catch(() => {});
          await page.waitForTimeout(1000);

          // Extract job information
          const titleElement = await page.locator('[data-testid="jobTitle"], .job-title, h2').first();
          const title = await titleElement.textContent().catch(() => '');

          const companyElement = await page.locator('[data-testid="companyName"], .company-name').first();
          const company = await companyElement.textContent().catch(() => '');

          const locationElement = await page.locator('[data-testid="jobLocation"], .job-location').first();
          const jobLocation = await locationElement.textContent().catch(() => '');

          // Try to extract salary
          let salary = 'Not specified';
          const salaryElement = await page.locator('[data-testid="salary"], .salary-range').first();
          if (await salaryElement.isVisible().catch(() => false)) {
            salary = (await salaryElement.textContent()) || 'Not specified';
          }

          // Get job description
          const descriptionElement = await page.locator('[data-testid="jobDescription"], .job-description').first();
          const jobDescription = await descriptionElement.textContent().catch(() => '');

          // Extract skills from description
          const skillsMatch = jobDescription?.match(/(?:skills?|expertise|required|technologies)[:\s]+([\w\s,&+#-.]+)/gi);
          const skills = skillsMatch
            ? skillsMatch[0]
                .split(/[,&]/)
                .map((s) => s.trim())
                .filter((s) => s)
            : [];

          // Get apply URL
          const jobId = await jobElement.getAttribute('data-job-id').catch(() => '');
          const applyUrl = `https://www.careerpages.com/job/${jobId}`;

          const jobData: CareerPagesJobData = {
            title: title?.trim() || 'Unknown Position',
            company_name: company?.trim() || 'Unknown Company',
            location: jobLocation?.trim() || location || 'India',
            salary: salary.trim(),
            experience_level: 'Not specified',
            required_skills: skills.slice(0, 10),
            job_description: jobDescription?.trim() || '',
            apply_url: applyUrl,
            source: 'careerpages',
            external_id: `careerpages-${jobId}`,
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
      logger.error('CareerPages scraping error:', error);
      return [];
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Apply to a job on CareerPages using browser automation
   */
  async applyToJob(jobUrl: string, userProfile: any): Promise<ApplyResult> {
    let page: Page | null = null;

    try {
      logger.info(`📤 Starting CareerPages auto-apply for: ${jobUrl}`);

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
      const applyButton = await page.locator('button:has-text("Apply"), button:has-text("Apply Now"), [data-testid="applyButton"]').first();
      const isApplyAvailable = await applyButton.isVisible().catch(() => false);

      if (!isApplyAvailable) {
        logger.info('ℹ️ Apply button not available for this job on CareerPages');
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
        logger.info(`✅ Successfully applied to job on CareerPages: ${jobUrl}`);
        return {
          success: true,
          appliedAt: new Date(),
          message: 'Successfully applied to CareerPages job',
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
      logger.error('CareerPages auto-apply error:', error);
      return {
        success: false,
        message: `CareerPages auto-apply failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
   * Fill CareerPages application form
   */
  private async fillApplicationForm(page: Page, userProfile: any): Promise<boolean> {
    try {
      logger.info('📝 Filling CareerPages application form...');

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
        logger.info('✅ Application form submitted on CareerPages');

        // Wait for confirmation
        await page.waitForTimeout(3000);

        return true;
      } else {
        logger.warn('⚠️ Submit button not found on CareerPages form');
        return false;
      }
    } catch (error) {
      logger.error('Error filling CareerPages application form:', error);
      return false;
    }
  }
}

export const careerPagesScraper = new CareerPagesScraper();
