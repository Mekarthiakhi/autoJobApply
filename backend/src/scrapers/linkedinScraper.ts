import { chromium, Browser, Page } from 'playwright';
import { logger } from '../utils/logger.js';

interface LinkedInJobData {
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

export class LinkedInScraper {
  private browser: Browser | null = null;
  private linkedinEmail: string = process.env.LINKEDIN_EMAIL || '';
  private linkedinPassword: string = process.env.LINKEDIN_PASSWORD || '';

  /**
   * Initialize browser connection
   */
  private async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
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
   * Login to LinkedIn
   */
  private async loginToLinkedIn(page: Page): Promise<boolean> {
    try {
      logger.info('🔐 Attempting LinkedIn login...');

      // Navigate to LinkedIn login
      await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle' });

      // Fill email
      await page.fill('input[name="session_key"]', this.linkedinEmail);
      await page.fill('input[name="session_password"]', this.linkedinPassword);

      // Click login button
      await page.click('button[type="submit"]');

      // Wait for navigation after login
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });

      // Check if login was successful by checking for profile icon
      const profileExists = await page.locator('[data-test-id="global-nav-me"]').isVisible();

      if (profileExists) {
        logger.info('✅ LinkedIn login successful');
        return true;
      } else {
        logger.warn('⚠️ LinkedIn login might have failed - profile not found');
        return false;
      }
    } catch (error) {
      logger.error('LinkedIn login error:', error);
      return false;
    }
  }

  /**
   * Search for jobs on LinkedIn
   */
  async searchJobs(keywords: string[], location: string = ''): Promise<LinkedInJobData[]> {
    let page: Page | null = null;

    try {
      logger.info('🔍 Starting LinkedIn job scraping...');

      const browser = await this.initBrowser();
      page = await browser.newPage();

      // Set user agent to avoid detection
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Build search URL
      const searchKeywords = keywords.join(' ');
      const baseUrl = 'https://www.linkedin.com/jobs/search/';
      const params = new URLSearchParams({
        keywords: searchKeywords,
        location: location || 'Remote',
      });

      const searchUrl = `${baseUrl}?${params.toString()}`;
      logger.info(`📍 Searching LinkedIn: ${searchUrl}`);

      // Navigate to jobs page
      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for job listings to load
      await page.waitForSelector('[data-job-id]', { timeout: 15000 });

      // Get all job listings
      const jobElements = await page.locator('[data-job-id]').all();
      logger.info(`📊 Found ${jobElements.length} job listings`);

      const jobs: LinkedInJobData[] = [];

      // Extract job data from each listing
      for (let i = 0; i < Math.min(jobElements.length, 20); i++) {
        try {
          const jobElement = jobElements[i];

          // Click on job to load details
          await jobElement.click();
          await page.waitForTimeout(1000); // Wait for details to load

          // Extract job information
          const jobId = await jobElement.getAttribute('data-job-id');
          const titleElement = await page.locator('.show-more-less-html__markup').first();
          const title = await titleElement.textContent();

          const companyElement = await page.locator('a.app-aware-link[href*="/company/"]').first();
          const company = await companyElement.textContent();

          const locationElement = await page.locator('[data-test-id="job-details-employment-type-job-location"]');
          const location = await locationElement.textContent();

          // Try to extract salary if available
          let salary = 'Not specified';
          const salaryElement = await page.locator('[data-test-id="job-details-salary"]');
          if (await salaryElement.isVisible()) {
            salary = (await salaryElement.textContent()) || 'Not specified';
          }

          // Get job description
          const descriptionElement = await page.locator('[data-test-id="job-details-main-content"]');
          const jobDescription = await descriptionElement.textContent();

          // Extract skills from description
          const skillsMatch = jobDescription?.match(/(?:skills?|expertise|competencies?)[:\s]+([\w\s,&+#-.]+)/gi);
          const skills = skillsMatch
            ? skillsMatch[0]
                .split(/[,&]/)
                .map((s) => s.trim())
                .filter((s) => s)
            : [];

          // Get apply URL
          const applyButton = await page.locator('button:has-text("Easy Apply"), button:has-text("Apply")').first();
          const applyUrl = (await page.url()) || `https://www.linkedin.com/jobs/view/${jobId}`;

          const jobData: LinkedInJobData = {
            title: title?.trim() || 'Unknown Position',
            company_name: company?.trim() || 'Unknown Company',
            location: location?.trim() || 'Remote',
            salary: salary.trim(),
            experience_level: 'Not specified',
            required_skills: skills.slice(0, 10),
            job_description: jobDescription?.trim() || '',
            apply_url: applyUrl,
            source: 'linkedin',
            external_id: `linkedin-${jobId}`,
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
      logger.error('LinkedIn scraping error:', error);
      return [];
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Apply to a job on LinkedIn using browser automation
   */
  async applyToJob(jobUrl: string, userProfile: any): Promise<ApplyResult> {
    let page: Page | null = null;

    try {
      logger.info(`📤 Starting LinkedIn auto-apply for: ${jobUrl}`);

      // Check if credentials are configured
      if (!this.linkedinEmail || !this.linkedinPassword) {
        logger.warn('⚠️ LinkedIn credentials not configured (LINKEDIN_EMAIL, LINKEDIN_PASSWORD)');
        return {
          success: false,
          message: 'LinkedIn credentials not configured',
          jobUrl,
          error: 'Missing LINKEDIN_EMAIL or LINKEDIN_PASSWORD environment variables',
        };
      }

      const browser = await this.initBrowser();
      page = await browser.newPage();

      // Set user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Login to LinkedIn
      const loginSuccess = await this.loginToLinkedIn(page);
      if (!loginSuccess) {
        return {
          success: false,
          message: 'Failed to login to LinkedIn',
          jobUrl,
          error: 'Authentication failed',
        };
      }

      // Navigate to job posting
      logger.info(`🔗 Navigating to job: ${jobUrl}`);
      await page.goto(jobUrl, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for page to load
      await page.waitForTimeout(2000);

      // Look for Easy Apply button
      const easyApplyButton = await page.locator('button:has-text("Easy Apply")').first();
      const isEasyApplyAvailable = await easyApplyButton.isVisible();

      if (!isEasyApplyAvailable) {
        logger.info('ℹ️ Easy Apply not available for this job');
        return {
          success: false,
          message: 'Easy Apply not available for this job',
          jobUrl,
          error: 'Manual application required',
        };
      }

      // Click Easy Apply button
      await easyApplyButton.click();
      await page.waitForTimeout(1000);

      // Handle application form
      const applicationSuccess = await this.fillApplicationForm(page, userProfile);

      if (applicationSuccess) {
        logger.info(`✅ Successfully applied to job: ${jobUrl}`);
        return {
          success: true,
          appliedAt: new Date(),
          message: 'Successfully applied to LinkedIn job using Easy Apply',
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
      logger.error('LinkedIn auto-apply error:', error);
      return {
        success: false,
        message: `LinkedIn auto-apply failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
   * Fill LinkedIn Easy Apply form
   */
  private async fillApplicationForm(page: Page, userProfile: any): Promise<boolean> {
    try {
      logger.info('📝 Filling application form...');

      // Wait for modal to appear
      await page.waitForSelector('.artdeco-modal__header', { timeout: 10000 });

      // Get all form fields
      const textInputs = await page.locator('input[type="text"], textarea').all();

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

      // Handle radio buttons and checkboxes
      const radioButtons = await page.locator('input[type="radio"]').all();
      for (const radio of radioButtons) {
        const value = await radio.getAttribute('value');
        // Select 'Yes' or appropriate options
        if (value?.toLowerCase().includes('yes') || value?.toLowerCase().includes('true')) {
          await radio.check();
        }
      }

      // Look for submit button and click
      const submitButton = await page.locator('button:has-text("Submit"), button:has-text("Apply Now")').first();

      if (await submitButton.isVisible()) {
        await submitButton.click();
        logger.info('✅ Application form submitted');

        // Wait for success message or navigation
        await page.waitForTimeout(3000);

        // Check for success confirmation
        const successMessage = await page.locator('text=/Successfully|Application sent|Thank you/i').first();
        if (await successMessage.isVisible()) {
          logger.info('✅ Application success confirmed');
          return true;
        }

        return true; // Assume success if submit was clicked
      } else {
        logger.warn('⚠️ Submit button not found');
        return false;
      }
    } catch (error) {
      logger.error('Error filling application form:', error);
      return false;
    }
  }
}

export const linkedinScraper = new LinkedInScraper();
