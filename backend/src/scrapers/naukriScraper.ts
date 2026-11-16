import { chromium, Browser, Page } from 'playwright';
import { logger } from '../utils/logger.js';

interface NaukriJobData {
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
  status: string;
  posted_date: Date;
}

export interface ApplyResult {
  success: boolean;
  appliedAt?: Date;
  message: string;
  jobUrl: string;
  error?: string;
  draftOnly?: boolean;
}

export interface ApplyOptions {
  explicitUserConfirmation?: boolean;
}

export class NaukriScraper {
  private browser: Browser | null = null;
  private naukriEmail: string = process.env.NAUKRI_EMAIL || '';
  private naukriPassword: string = process.env.NAUKRI_PASSWORD || '';

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
   * Login to Naukri
   */
  private async loginToNaukri(page: Page): Promise<boolean> {
    try {
      logger.info('🔐 Attempting Naukri login...');

      // Navigate to Naukri login
      await page.goto('https://www.naukri.com/naukri/user/login', { waitUntil: 'networkidle' });

      // Fill email
      await page.fill('input[placeholder="Enter your email ID"]', this.naukriEmail);
      
      // Fill password
      await page.fill('input[placeholder="Enter your password"]', this.naukriPassword);

      // Click login button
      await page.click('button.loginButton');

      // Wait for navigation after login
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });

      // Check if login was successful by checking for dashboard
      const dashboardExists = await page.locator('[data-qa="naukri-dashboard"]').isVisible().catch(() => false);

      if (dashboardExists) {
        logger.info('✅ Naukri login successful');
        return true;
      } else {
        logger.warn('⚠️ Naukri login might have failed');
        return false;
      }
    } catch (error) {
      logger.error('Naukri login error:', error);
      return false;
    }
  }

  /**
   * Search for jobs on Naukri
   */
  async searchJobs(keywords: string[], location: string = ''): Promise<NaukriJobData[]> {
    let page: Page | null = null;

    try {
      logger.info('🔍 Starting Naukri job scraping...');

      const browser = await this.initBrowser();
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      page = await context.newPage();

      // Build search URL with parameters
      const searchKeywords = keywords.join('%20');
      const searchUrl = `https://www.naukri.com/jobs-${searchKeywords}-${location || 'india'}-0`;
      
      logger.info(`📍 Searching Naukri: ${searchUrl}`);

      // Navigate to search results
      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for job listings to load
      await page.waitForSelector('[data-qa="jobCard"]', { timeout: 15000 });

      // Get all job listings
      const jobElements = await page.locator('[data-qa="jobCard"]').all();
      logger.info(`📊 Found ${jobElements.length} job listings on Naukri`);

      const jobs: NaukriJobData[] = [];

      // Extract job data from each listing
      for (let i = 0; i < Math.min(jobElements.length, 20); i++) {
        try {
          const jobElement = jobElements[i];

          // Click on job to load details
          await jobElement.click();
          await page.waitForTimeout(1000); // Wait for details to load

          // Extract job information
          const titleElement = await page.locator('[data-qa="jobTitle"]').first();
          const title = await titleElement.textContent();

          const companyElement = await page.locator('[data-qa="jobCard-companyName"]').first();
          const company = await companyElement.textContent();

          const locationElement = await page.locator('[data-qa="jobCard-location"]').first();
          const jobLocation = await locationElement.textContent();

          // Try to extract salary
          let salary = 'Not specified';
          const salaryElement = await page.locator('[data-qa="jobCard-salary"]').first();
          if (await salaryElement.isVisible().catch(() => false)) {
            salary = (await salaryElement.textContent()) || 'Not specified';
          }

          // Get experience level
          let experience = 'Not specified';
          const expElement = await page.locator('[data-qa="jobCard-experience"]').first();
          if (await expElement.isVisible().catch(() => false)) {
            experience = (await expElement.textContent()) || 'Not specified';
          }

          // Get job description
          const descriptionElement = await page.locator('[data-qa="jobDescription"]').first();
          const jobDescription = await descriptionElement.textContent().catch(() => '');

          // Extract skills from description
          const skillsMatch = jobDescription?.match(/(?:skills?|expertise|required)[:\s]+([\w\s,&+#-.]+)/gi);
          const skills = skillsMatch
            ? skillsMatch[0]
                .split(/[,&]/)
                .map((s) => s.trim())
                .filter((s) => s)
            : [];

          // Get apply URL
          const jobId = await jobElement.getAttribute('data-job-id');
          const applyUrl = `https://www.naukri.com/job-listings-${jobId}`;

          const jobData: NaukriJobData = {
            title: title?.trim() || 'Unknown Position',
            company_name: company?.trim() || 'Unknown Company',
            location: jobLocation?.trim() || location || 'India',
            salary: salary.trim(),
            experience_level: experience.trim(),
            required_skills: skills.slice(0, 10),
            job_description: jobDescription?.trim() || '',
            apply_url: applyUrl,
            source: 'naukri',
            external_id: `naukri-${jobId}`,
            status: 'NEW',
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
      logger.error('Naukri scraping error:', error);
      return [];
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Apply to a job on Naukri using browser automation.
   * SAFEGUARD: Operates in Draft Mode by default. Never clicks Submit without options.explicitUserConfirmation === true.
   */
  async applyToJob(
    jobUrl: string,
    userProfile: any,
    options: ApplyOptions = {}
  ): Promise<ApplyResult> {
    let page: Page | null = null;

    try {
      logger.info(`📤 Starting Naukri application processing for: ${jobUrl}`);

      // Check if credentials are configured
      if (!this.naukriEmail || !this.naukriPassword) {
        logger.warn('⚠️ Naukri credentials not configured (NAUKRI_EMAIL, NAUKRI_PASSWORD)');
        return {
          success: false,
          message: 'Naukri credentials not configured',
          jobUrl,
          error: 'Missing NAUKRI_EMAIL or NAUKRI_PASSWORD environment variables',
        };
      }

      const browser = await this.initBrowser();
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      page = await context.newPage();

      // Login to Naukri
      const loginSuccess = await this.loginToNaukri(page);
      if (!loginSuccess) {
        return {
          success: false,
          message: 'Failed to login to Naukri',
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
      const applyButton = await page.locator('[data-qa="applyButton"], button:has-text("Apply")').first();
      const isApplyAvailable = await applyButton.isVisible().catch(() => false);

      if (!isApplyAvailable) {
        logger.info('ℹ️ Apply button not available for this job');
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

      // Handle application form (Draft Mode by default)
      const formResult = await this.fillApplicationForm(page, userProfile, options);

      if (formResult.success) {
        if (!formResult.submitted) {
          logger.info(`🛡️ [Safety Guard] Application draft prepared safely on Naukri for: ${jobUrl}`);
          return {
            success: true,
            draftOnly: true,
            message: 'Application draft prepared. Explicit user approval required to submit.',
            jobUrl,
          };
        }

        logger.info(`✅ Successfully applied to job on Naukri: ${jobUrl}`);
        return {
          success: true,
          appliedAt: new Date(),
          message: 'Successfully applied to Naukri job',
          jobUrl,
        };
      } else {
        return {
          success: false,
          message: 'Failed to complete application form',
          jobUrl,
          error: 'Application form preparation failed',
        };
      }
    } catch (error) {
      logger.error('Naukri auto-apply error:', error);
      return {
        success: false,
        message: `Naukri auto-apply failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
   * Fill Naukri application form.
   * SAFEGUARD: Only fills verified user details. Does not guess question answers or agree to terms.
   * NEVER clicks submit unless options.explicitUserConfirmation === true.
   */
  private async fillApplicationForm(
    page: Page,
    userProfile: any,
    options: ApplyOptions = {}
  ): Promise<{ success: boolean; submitted: boolean }> {
    try {
      logger.info('📝 Preparing Naukri application form draft...');

      // Wait for form to appear
      await page.waitForSelector('[data-qa="applicationForm"], form', { timeout: 10000 });

      // Get all form fields
      const textInputs = await page.locator('input[type="text"], textarea, input[type="email"]').all();

      // Fill text fields if they exist
      for (const input of textInputs) {
        const placeholder = await input.getAttribute('placeholder');
        const name = await input.getAttribute('name');

        if (placeholder?.toLowerCase().includes('phone')) {
          await input.fill(userProfile.phone || '');
        } else if (placeholder?.toLowerCase().includes('email')) {
          await input.fill(userProfile.email || '');
        } else if (placeholder?.toLowerCase().includes('message') || name?.toLowerCase().includes('message')) {
          const coverLetter = userProfile.coverLetter || 'I am interested in this position.';
          await input.fill(coverLetter);
        }
      }

      // Look for submit button
      const submitButton = await page.locator('button:has-text("Submit"), button:has-text("Apply Now"), [data-qa="submitButton"]').first();
      const hasSubmitButton = await submitButton.isVisible().catch(() => false);

      // SAFEGUARD: Do not submit unless explicitly confirmed by user
      if (!options.explicitUserConfirmation) {
        logger.info('🛡️ [Safety Guard] Naukri form draft prepared. Stopped before final submission (explicit confirmation required).');
        return { success: true, submitted: false };
      }

      if (hasSubmitButton) {
        await submitButton.click();
        logger.info('✅ Application form submitted on Naukri with explicit user confirmation');

        await page.waitForTimeout(3000);
        return { success: true, submitted: true };
      } else {
        logger.warn('⚠️ Submit button not found on Naukri form');
        return { success: false, submitted: false };
      }
    } catch (error) {
      logger.error('Error filling Naukri application form:', error);
      return { success: false, submitted: false };
    }
  }
}

export const naukriScraper = new NaukriScraper();
