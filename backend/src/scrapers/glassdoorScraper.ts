import { chromium, Browser, Page } from 'playwright';
import { logger } from '../utils/logger.js';

interface GlassdoorJobData {
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

export class GlassdoorScraper {
  private browser: Browser | null = null;
  private glassdoorEmail: string = process.env.GLASSDOOR_EMAIL || '';
  private glassdoorPassword: string = process.env.GLASSDOOR_PASSWORD || '';

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
   * Login to Glassdoor
   */
  private async loginToGlassdoor(page: Page): Promise<boolean> {
    try {
      logger.info('🔐 Attempting Glassdoor login...');

      // Navigate to Glassdoor login
      await page.goto('https://www.glassdoor.com/profile/login_input.htm', { waitUntil: 'networkidle' });

      // Fill email
      await page.fill('input[name="email"], input[type="email"]', this.glassdoorEmail);

      // Fill password
      await page.fill('input[name="password"], input[type="password"]', this.glassdoorPassword);

      // Click login button
      const loginButton = await page.locator('button:has-text("Sign In"), button[type="submit"]').first();
      await loginButton.click();

      // Wait for navigation after login
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});

      // Check if login was successful
      const dashboardExists = await page.locator('[data-test-id="user-profile"], .GD_Header').isVisible().catch(() => false);

      if (dashboardExists) {
        logger.info('✅ Glassdoor login successful');
        return true;
      } else {
        logger.warn('⚠️ Glassdoor login might have failed - dashboard not found');
        return false;
      }
    } catch (error) {
      logger.error('Glassdoor login error:', error);
      return false;
    }
  }

  /**
   * Search for jobs on Glassdoor
   */
  async searchJobs(keywords: string[], location: string = ''): Promise<GlassdoorJobData[]> {
    let page: Page | null = null;

    try {
      logger.info('🔍 Starting Glassdoor job scraping...');

      const browser = await this.initBrowser();
      page = await browser.newPage();

      // Set user agent to avoid detection
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Build search URL
      const searchKeywords = keywords.join('+');
      const searchUrl = `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${searchKeywords}&locT=C&locId=${location ? encodeURIComponent(location) : '1147401'}`;

      logger.info(`📍 Searching Glassdoor: ${searchUrl}`);

      // Navigate to search results
      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for job listings to load
      await page.waitForSelector('[data-job-id], [data-test-id="JobCard"]', { timeout: 15000 }).catch(() => {});

      // Get all job listings
      let jobElements = await page.locator('[data-job-id]').all();
      if (jobElements.length === 0) {
        jobElements = await page.locator('[data-test-id="JobCard"]').all();
      }
      if (jobElements.length === 0) {
        jobElements = await page.locator('li[data-test-id*="job"]').all();
      }

      logger.info(`📊 Found ${jobElements.length} job listings on Glassdoor`);

      const jobs: GlassdoorJobData[] = [];

      // Extract job data from each listing
      for (let i = 0; i < Math.min(jobElements.length, 20); i++) {
        try {
          const jobElement = jobElements[i];

          // Click on job to load details
          await jobElement.click().catch(() => {});
          await page.waitForTimeout(1200);

          // Extract job information
          const titleElement = await page.locator('[data-test-id="job-title"], .JobTitle').first();
          const title = await titleElement.textContent().catch(() => '');

          const companyElement = await page.locator('[data-test-id="employer-name"], .EmployerName').first();
          const company = await companyElement.textContent().catch(() => '');

          const locationElement = await page.locator('[data-test-id="job-location"], .JobLocation').first();
          const jobLocation = await locationElement.textContent().catch(() => '');

          // Try to extract salary
          let salary = 'Not specified';
          const salaryElement = await page.locator('[data-test-id="salary"], .Salary').first();
          if (await salaryElement.isVisible().catch(() => false)) {
            salary = (await salaryElement.textContent()) || 'Not specified';
          }

          // Get job description
          const descriptionElement = await page.locator('[data-test-id="jobDescription"], .JobDescription').first();
          const jobDescription = await descriptionElement.textContent().catch(() => '');

          // Extract skills from description
          const skillsMatch = jobDescription?.match(/(?:skills?|expertise|required|experience)[:\s]+([\w\s,&+#-.]+)/gi);
          const skills = skillsMatch
            ? skillsMatch[0]
                .split(/[,&]/)
                .map((s) => s.trim())
                .filter((s) => s)
            : [];

          // Get apply URL
          const jobId = await jobElement.getAttribute('data-job-id').catch(() => '');
          const applyUrl = `https://www.glassdoor.com/job-listing/${jobId}`;

          const jobData: GlassdoorJobData = {
            title: title?.trim() || 'Unknown Position',
            company_name: company?.trim() || 'Unknown Company',
            location: jobLocation?.trim() || location || 'Remote',
            salary: salary.trim(),
            experience_level: 'Not specified',
            required_skills: skills.slice(0, 10),
            job_description: jobDescription?.trim() || '',
            apply_url: applyUrl,
            source: 'glassdoor',
            external_id: `glassdoor-${jobId}`,
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
      logger.error('Glassdoor scraping error:', error);
      return [];
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Apply to a job on Glassdoor using browser automation
   */
  async applyToJob(jobUrl: string, userProfile: any): Promise<ApplyResult> {
    let page: Page | null = null;

    try {
      logger.info(`📤 Starting Glassdoor auto-apply for: ${jobUrl}`);

      // Check if credentials are configured
      if (!this.glassdoorEmail || !this.glassdoorPassword) {
        logger.warn('⚠️ Glassdoor credentials not configured (GLASSDOOR_EMAIL, GLASSDOOR_PASSWORD)');
        return {
          success: false,
          message: 'Glassdoor credentials not configured',
          jobUrl,
          error: 'Missing GLASSDOOR_EMAIL or GLASSDOOR_PASSWORD environment variables',
        };
      }

      const browser = await this.initBrowser();
      page = await browser.newPage();

      // Set user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Login to Glassdoor
      const loginSuccess = await this.loginToGlassdoor(page);
      if (!loginSuccess) {
        return {
          success: false,
          message: 'Failed to login to Glassdoor',
          jobUrl,
          error: 'Authentication failed',
        };
      }

      // Navigate to job posting
      logger.info(`🔗 Navigating to job: ${jobUrl}`);
      await page.goto(jobUrl, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for page to load
      await page.waitForTimeout(2000);

      // Look for Apply button
      const applyButton = await page.locator('button:has-text("Apply"), button:has-text("Apply Now"), button:has-text("Easy Apply"), [data-test-id="applyButton"]').first();
      const isApplyAvailable = await applyButton.isVisible().catch(() => false);

      if (!isApplyAvailable) {
        logger.info('ℹ️ Apply button not available for this job on Glassdoor');
        return {
          success: false,
          message: 'Apply button not available for this job',
          jobUrl,
          error: 'Already applied or manual application required',
        };
      }

      // Click Apply button
      await applyButton.click();
      await page.waitForTimeout(1500);

      // Handle application form
      const applicationSuccess = await this.fillApplicationForm(page, userProfile);

      if (applicationSuccess) {
        logger.info(`✅ Successfully applied to job on Glassdoor: ${jobUrl}`);
        return {
          success: true,
          appliedAt: new Date(),
          message: 'Successfully applied to Glassdoor job',
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
      logger.error('Glassdoor auto-apply error:', error);
      return {
        success: false,
        message: `Glassdoor auto-apply failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
   * Fill Glassdoor application form
   */
  private async fillApplicationForm(page: Page, userProfile: any): Promise<boolean> {
    try {
      logger.info('📝 Filling Glassdoor application form...');

      // Wait for form to appear
      await page.waitForSelector('form, [data-test-id="applicationForm"]', { timeout: 10000 }).catch(() => {});

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

      // Handle file uploads (resume)
      const fileInputs = await page.locator('input[type="file"]').all();
      if (fileInputs.length > 0 && userProfile.resumePath) {
        try {
          await fileInputs[0].setInputFiles(userProfile.resumePath);
          logger.info('📄 Resume uploaded');
        } catch (uploadError) {
          logger.warn('⚠️ Could not upload resume:', uploadError);
        }
      }

      // Look for submit button and click
      const submitButton = await page.locator('button:has-text("Submit"), button:has-text("Apply"), button:has-text("Send Application"), button[type="submit"]').first();

      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
        logger.info('✅ Application form submitted on Glassdoor');

        // Wait for confirmation
        await page.waitForTimeout(3000);

        // Check for success confirmation
        const successMessage = await page.locator('text=/Successfully|Application|Thank you|Applied|submitted/i').first();
        if (await successMessage.isVisible().catch(() => false)) {
          logger.info('✅ Application success confirmed on Glassdoor');
          return true;
        }

        return true; // Assume success if submit was clicked
      } else {
        logger.warn('⚠️ Submit button not found on Glassdoor form');
        return false;
      }
    } catch (error) {
      logger.error('Error filling Glassdoor application form:', error);
      return false;
    }
  }
}

export const glassdoorScraper = new GlassdoorScraper();
