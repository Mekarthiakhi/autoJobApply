import { BrowserContext, LaunchOptions } from 'playwright';
import { logger } from '../utils/logger.js';

/**
 * Playwright browser configuration for job scraping and auto-apply
 */
export const playwrightConfig = {
  /**
   * Browser launch options
   */
  launchOptions: {
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-client-side-phishing-detection',
      '--disable-component-update',
      '--disable-component-extensions-with-background-pages',
      '--disable-extensions',
      '--disable-hang-monitor',
      '--disable-ipc-flooding-protection',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-range-requests',
      '--disable-sync',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-default-browser-check',
      '--no-service-autorun',
      '--password-store=basic',
      '--use-mock-keychain',
      '--enable-automation=false',
    ],
  } as LaunchOptions,

  /**
   * Context options for realistic browsing
   */
  contextOptions: {
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    geolocation: { latitude: 40.7128, longitude: -74.006 },
    permissions: [],
    ignoreHTTPSErrors: true,
  },

  /**
   * Navigation timeout
   */
  navigationTimeout: 30000,

  /**
   * Selector timeout
   */
  selectorTimeout: 15000,

  /**
   * Default wait time between actions
   */
  defaultWaitTime: 1000,

  /**
   * Retry configuration
   */
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
  },

  /**
   * Stealth mode headers to avoid detection
   */
  stealthHeaders: {
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
};

/**
 * LinkedIn-specific configuration
 */
export const linkedinConfig = {
  baseUrl: 'https://www.linkedin.com',
  loginUrl: 'https://www.linkedin.com/login',
  jobsSearchUrl: 'https://www.linkedin.com/jobs/search/',

  /**
   * LinkedIn selectors
   */
  selectors: {
    emailInput: 'input[name="session_key"]',
    passwordInput: 'input[name="session_password"]',
    loginButton: 'button[type="submit"]',
    profileIcon: '[data-test-id="global-nav-me"]',
    easyApplyButton: 'button:has-text("Easy Apply")',
    submitButton: 'button:has-text("Submit"), button:has-text("Apply Now")',
    jobListing: '[data-job-id]',
    jobTitle: '.show-more-less-html__markup',
    jobCompany: 'a.app-aware-link[href*="/company/"]',
    jobLocation: '[data-test-id="job-details-employment-type-job-location"]',
    jobSalary: '[data-test-id="job-details-salary"]',
    jobDescription: '[data-test-id="job-details-main-content"]',
  },

  /**
   * Wait times (ms)
   */
  waitTimes: {
    afterLogin: 3000,
    afterClick: 1000,
    afterFillForm: 2000,
    afterSubmit: 3000,
  },

  /**
   * Maximum jobs to scrape per search
   */
  maxJobsPerSearch: 20,

  /**
   * Delay between actions (to avoid detection)
   */
  actionDelayMs: 500,
};

/**
 * Retry logic for failed operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxAttempts: number = playwrightConfig.retry.maxAttempts
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.info(`🔄 Attempt ${attempt}/${maxAttempts} for ${operationName}`);
      const result = await operation();
      logger.info(`✅ ${operationName} succeeded on attempt ${attempt}`);
      return result;
    } catch (error) {
      logger.warn(`❌ ${operationName} failed on attempt ${attempt}: ${error}`);

      if (attempt < maxAttempts) {
        const backoffTime = playwrightConfig.retry.backoffMs * attempt;
        logger.info(`⏳ Waiting ${backoffTime}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
      }
    }
  }

  logger.error(`❌ ${operationName} failed after ${maxAttempts} attempts`);
  return null;
}

/**
 * Anti-detection utilities
 */
export const antiDetection = {
  /**
   * Add random delay to mimic human behavior
   */
  async randomDelay(minMs: number = 500, maxMs: number = 2000): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await new Promise((resolve) => setTimeout(resolve, delay));
  },

  /**
   * Random scroll action
   */
  async randomScroll(page: any): Promise<void> {
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    const randomScroll = Math.random() * scrollHeight * 0.5;
    await page.evaluate((scroll) => window.scrollBy(0, scroll), randomScroll);
  },

  /**
   * Add mouse movements for human-like behavior
   */
  async humanMouseMovement(page: any): Promise<void> {
    const x = Math.random() * 1920;
    const y = Math.random() * 1080;
    await page.mouse.move(x, y);
  },
};

export default playwrightConfig;
