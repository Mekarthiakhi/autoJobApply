import { chromium, Browser, Page } from 'playwright';
import { playwrightConfig } from '../config/playwrightConfig.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { popupAgent } from './popupAgent.js';
import fs from 'fs';
import path from 'path';

export interface BrowserAgentResult {
  screenshotPath: string | null;
  scrapedQuestions: string[];
  pageTitle: string;
  warnings: string[];
}

export class BrowserAgent {
  private browser: Browser | null = null;

  /**
   * Open a job URL, capture a screenshot, extract any visible form questions.
   * NEVER submits anything.
   */
  async inspectJobPage(jobUrl: string, jobId: string): Promise<BrowserAgentResult> {
    logger.info('Inspecting job page', { agent: 'Browser', jobUrl });

    const warnings: string[] = [];
    let screenshotPath: string | null = null;
    let scrapedQuestions: string[] = [];
    let pageTitle = '';

    try {
      // Ensure screenshots directory exists
      if (!fs.existsSync(env.SCREENSHOTS_DIR)) {
        fs.mkdirSync(env.SCREENSHOTS_DIR, { recursive: true });
      }

      try {
        this.browser = await chromium.connectOverCDP('http://localhost:9222');
      } catch (err) {
        logger.error('Failed to connect to CDP in BrowserAgent', err);
        throw new Error('Chrome CDP connection failed');
      }

      const contexts = this.browser.contexts();
      const context = contexts.length > 0 ? contexts[0] : await this.browser.newContext();
      const page = await context.newPage();
      page.setDefaultTimeout(playwrightConfig.navigationTimeout);

      // Navigate to job URL
      try {
        await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: playwrightConfig.navigationTimeout });
        // Auto-accept cookies, dismiss dialogs, and select first option if popup prompts
        await popupAgent.autoHandleAll(page);
      } catch (navError) {
        warnings.push(`Page load issue: ${navError instanceof Error ? navError.message : 'timeout'}`);
      }

      pageTitle = await page.title();

      // Capture screenshot
      const screenshotFile = `job-${jobId}-${Date.now()}.png`;
      screenshotPath = path.join(env.SCREENSHOTS_DIR, screenshotFile);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      // Extract visible form questions / labels
      scrapedQuestions = await this.extractFormQuestions(page);

      // Check for login walls
      const loginIndicators = ['sign in', 'log in', 'create account', 'sign up'];
      const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
      const hasLoginWall = loginIndicators.some(indicator => {
        const count = (bodyText.match(new RegExp(indicator, 'g')) || []).length;
        return count >= 2; // Multiple login prompts suggest a wall
      });

      if (hasLoginWall) {
        warnings.push('Page may require login to view full job details or apply');
      }

      await page.close();

      logger.info('Job page inspected', {
        agent: 'Browser',
        jobId,
        questionsFound: scrapedQuestions.length,
        warnings: warnings.length,
      });
    } catch (error) {
      logger.error('Browser inspection failed', { agent: 'Browser', jobUrl, error });
      warnings.push(`Inspection error: ${error instanceof Error ? error.message : 'unknown'}`);
    } finally {
      await this.closeBrowser();
    }

    return { screenshotPath, scrapedQuestions, pageTitle, warnings };
  }

  /**
   * Extract form labels and questions from the page.
   */
  private async extractFormQuestions(page: Page): Promise<string[]> {
    try {
      const questions = await page.evaluate(() => {
        const labels: string[] = [];

        // Collect from <label> elements
        document.querySelectorAll('label').forEach((el) => {
          const text = el.textContent?.trim();
          if (text && text.length > 2 && text.length < 200) {
            labels.push(text);
          }
        });

        // Collect from input placeholders
        document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((el) => {
          const placeholder = el.getAttribute('placeholder')?.trim();
          if (placeholder && placeholder.length > 2) {
            labels.push(`[Field] ${placeholder}`);
          }
        });

        return [...new Set(labels)].slice(0, 30);
      });

      return questions;
    } catch {
      return [];
    }
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      try { await this.browser.close(); } catch { /* ignore */ }
      this.browser = null;
    }
  }
}

export const browserAgent = new BrowserAgent();
