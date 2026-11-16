import { Page } from 'playwright';
import { ApplicationAnswer, ControlledFormPreparationResult } from './types.js';
import { logger } from '../utils/logger.js';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';

export class ControlledBrowserAgent {
  /**
   * Prepares form answers in the browser, strictly stopping before final submission.
   * Never selects legal/consent checkboxes, never bypasses anti-bot obstacles, never fabricates answers.
   */
  async prepareFormDraft(
    page: Page,
    answers: ApplicationAnswer[],
    jobId: string
  ): Promise<ControlledFormPreparationResult> {
    logger.info('Preparing application form draft in browser', { agent: 'ControlledBrowser', jobId });

    // 1. Anti-Bot Sentinel Check
    const challenges = await this.detectChallenges(page);
    if (challenges.length > 0) {
      logger.warn('Anti-bot challenge or verification detected; halting automation safely for candidate action', {
        challenges,
      });
      const screenshotPath = await this.captureScreenshot(page, `challenge-${jobId}`);
      return {
        status: 'PAUSED_FOR_USER',
        filledFieldsCount: 0,
        unfilledFields: [],
        encounteredChallenges: challenges,
        screenshotPath,
        requiresCandidateAction: true,
        reason: `Encountered verification gate (${challenges.join(', ')}). Platform access restrictions must not be bypassed. Candidate must complete verification directly.`,
      };
    }

    let filledCount = 0;
    const unfilledFields: string[] = [];

    // 2. Iterate through form answers and fill fields safely
    for (const ans of answers) {
      // SAFEGUARD: Never check legal agreements or consent checkboxes automatically
      if (ans.isLegalOrConsentCheckbox || this.isLegalOrConsentText(ans.question)) {
        logger.info('Skipping legal/consent checkbox for human-in-the-loop candidate verification', {
          question: ans.question,
        });
        unfilledFields.push(`[Consent/Agreement - Must check manually] ${ans.question}`);
        continue;
      }

      // SAFEGUARD: Never fabricate answers if missing or uncertain
      if (!ans.answer || !ans.isConfident) {
        unfilledFields.push(`[Uncertain/Missing] ${ans.question}`);
        continue;
      }

      try {
        const filled = await this.fillField(page, ans);
        if (filled) {
          filledCount++;
        } else {
          unfilledFields.push(ans.question);
        }
      } catch (err: any) {
        logger.warn('Failed to fill field', { question: ans.question, error: err.message });
        unfilledFields.push(ans.question);
      }
    }

    // 3. Capture screenshot of prepared form
    const screenshotPath = await this.captureScreenshot(page, `draft-${jobId}`);

    // SAFEGUARD: Strict stoppage before submission
    logger.info('Form preparation complete: Halted strictly before final submission', {
      jobId,
      filledCount,
      unfilledCount: unfilledFields.length,
    });

    return {
      status: unfilledFields.length > 0 ? 'PAUSED_FOR_USER' : 'PREPARED_STOPPED_BEFORE_SUBMIT',
      filledFieldsCount: filledCount,
      unfilledFields,
      encounteredChallenges: [],
      screenshotPath,
      requiresCandidateAction: unfilledFields.length > 0,
      reason: 'Draft prepared. Final submission requires explicit candidate approval on the review queue.',
    };
  }

  /**
   * Execute final submission only after backend verification confirms explicit human approval
   */
  async executeControlledSubmission(
    page: Page,
    applicationId: string,
    submitSelector: string = 'button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Apply")'
  ): Promise<{ success: boolean; screenshotPath: string | null; confirmationText?: string }> {
    logger.info('Initiating final application submission', { applicationId });

    // Ensure we do not click submit if a challenge has appeared
    const challenges = await this.detectChallenges(page);
    if (challenges.length > 0) {
      throw new Error(`Cannot submit application: Anti-bot challenge detected (${challenges.join(', ')}).`);
    }

    // Click submit button
    const submitBtn = page.locator(submitSelector).first();
    const isVisible = await submitBtn.isVisible().catch(() => false);
    if (!isVisible) {
      throw new Error('Submit button not found or not visible on page');
    }

    await submitBtn.click();
    await page.waitForTimeout(3000);

    const screenshotPath = await this.captureScreenshot(page, `submitted-${applicationId}`);
    const pageText = await page.textContent('body').catch(() => '');
    const isConfirmed = /thank you|application submitted|successfully applied|received your application/i.test(pageText || '');

    return {
      success: true,
      screenshotPath,
      confirmationText: isConfirmed ? 'Application submitted successfully and confirmed by platform.' : 'Submission click executed.',
    };
  }

  /**
   * Detect anti-bot obstacles (Cloudflare Turnstile, reCAPTCHA, hCaptcha, OTP, LinkedIn security verification)
   */
  async detectChallenges(page: Page): Promise<string[]> {
    const detected: string[] = [];

    try {
      const pageContent = (await page.content()).toLowerCase();

      if (pageContent.includes('cf-turnstile') || pageContent.includes('challenges.cloudflare.com')) {
        detected.push('Cloudflare Turnstile');
      }
      if (pageContent.includes('g-recaptcha') || pageContent.includes('recaptcha/api.js')) {
        detected.push('Google reCAPTCHA');
      }
      if (pageContent.includes('hcaptcha.com') || pageContent.includes('h-captcha')) {
        detected.push('hCaptcha');
      }
      if (pageContent.includes('checkpoint/challenge') || pageContent.includes('security verification')) {
        detected.push('Security Verification Checkpoint');
      }
      if (pageContent.includes('enter the code sent') || pageContent.includes('one-time password') || pageContent.includes('verification code')) {
        detected.push('SMS/Email OTP Gate');
      }
    } catch {
      // Ignore evaluation errors
    }

    return detected;
  }

  /**
   * Check if text relates to legal agreements, consents, or terms that require candidate verification
   */
  isLegalOrConsentText(text: string): boolean {
    const legalKeywords = [
      'terms of service',
      'terms and conditions',
      'privacy policy',
      'i agree',
      'i consent',
      'i acknowledge',
      'background check',
      'consent to background',
      'arbitration agreement',
      'equal opportunity consent',
      'certify that the information',
      'under penalty of perjury',
      'legal declaration',
      'electronic signature',
    ];
    const lower = text.toLowerCase();
    return legalKeywords.some(kw => lower.includes(kw));
  }

  /**
   * Fill individual form field
   */
  private async fillField(page: Page, ans: ApplicationAnswer): Promise<boolean> {
    const qClean = ans.question.replace(/[:*?]/g, '').trim();

    // Try finding by label text
    const labelLocator = page.locator(`label:has-text("${qClean}")`).first();
    const hasLabel = await labelLocator.isVisible().catch(() => false);

    if (hasLabel) {
      const forAttr = await labelLocator.getAttribute('for').catch(() => null);
      if (forAttr) {
        const input = page.locator(`#${forAttr}`);
        if (await input.isVisible().catch(() => false)) {
          await input.fill(ans.answer);
          return true;
        }
      }
    }

    // Try finding by placeholder
    const placeholderInput = page.locator(`input[placeholder*="${qClean}" i], textarea[placeholder*="${qClean}" i]`).first();
    if (await placeholderInput.isVisible().catch(() => false)) {
      await placeholderInput.fill(ans.answer);
      return true;
    }

    // Try finding by name
    const nameSlug = qClean.toLowerCase().replace(/\s+/g, '_');
    const nameInput = page.locator(`input[name*="${nameSlug}" i], textarea[name*="${nameSlug}" i]`).first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill(ans.answer);
      return true;
    }

    return false;
  }

  private async captureScreenshot(page: Page, prefix: string): Promise<string | null> {
    try {
      if (!fs.existsSync(env.SCREENSHOTS_DIR)) {
        fs.mkdirSync(env.SCREENSHOTS_DIR, { recursive: true });
      }
      const filename = `${prefix}-${Date.now()}.png`;
      const fullPath = path.join(env.SCREENSHOTS_DIR, filename);
      await page.screenshot({ path: fullPath, fullPage: false });
      return fullPath;
    } catch {
      return null;
    }
  }
}

export const controlledBrowserAgent = new ControlledBrowserAgent();

