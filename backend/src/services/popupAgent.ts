import { Page } from 'playwright';
import { logger } from '../utils/logger.js';

export interface PopupActionLog {
  action: 'dialog_accepted' | 'cookie_accepted' | 'option_selected' | 'modal_dismissed' | 'checkbox_checked';
  details: string;
}

export class PopupAgent {
  /**
   * Set up native browser dialog listener.
   * Automatically accepts any alert, confirm, or prompt popup.
   */
  setupDialogListener(page: Page): void {
    page.removeAllListeners('dialog');
    page.on('dialog', async (dialog) => {
      logger.info(`🤖 [PopupAgent] Detected browser dialog [${dialog.type()}]: "${dialog.message()}". Accepting...`);
      try {
        await dialog.accept();
      } catch (err) {
        logger.warn(`[PopupAgent] Failed to accept dialog: ${err}`);
      }
    });
  }

  /**
   * Automatically detect and click "Accept All", "Accept Cookies", "Allow All", "I Agree" banners.
   */
  async acceptAllCookies(page: Page): Promise<boolean> {
    const cookieSelectors = [
      // Standard "Accept All" text variants
      'button:has-text("Accept all cookies")',
      'button:has-text("Accept All Cookies")',
      'button:has-text("Accept all")',
      'button:has-text("Accept All")',
      'button:has-text("Allow all cookies")',
      'button:has-text("Allow all")',
      'button:has-text("Allow All")',
      'button:has-text("I agree")',
      'button:has-text("I Agree")',
      'button:has-text("Accept cookies")',
      'button:has-text("Accept Cookies")',
      'button:has-text("Accept")',
      'button:has-text("Agree")',
      'button:has-text("Got it")',
      'button:has-text("I understand")',
      // Common CMP identifiers (OneTrust, Didomi, Cookiebot, TrustArc, LinkedIn)
      '#onetrust-accept-btn-handler',
      '#didomi-notice-agree-button',
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
      '.cc-btn.cc-accept-all',
      'button[data-control-name="ga-cookie.consent.accept.v4"]',
      'button[aria-label="Accept all"]',
      'button[aria-label="Accept cookies"]',
      '[data-testid="cookie-banner-accept"]',
    ];

    for (const selector of cookieSelectors) {
      try {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 400 }).catch(() => false)) {
          logger.info(`🤖 [PopupAgent] Found cookie consent button (${selector}). Clicking "Accept All"...`);
          await btn.click({ timeout: 1500 });
          await page.waitForTimeout(400);
          return true;
        }
      } catch {
        // Try next selector
      }
    }

    return false;
  }

  /**
   * Safe Question Detection:
   * Scans for visible questionnaire fields (dropdowns, radio groups, text inputs)
   * and preserves the questions for human review.
   *
   * SAFEGUARD: NEVER automatically selects options, chooses radio buttons,
   * or checks legal/qualification checkboxes.
   */
  async detectUnansweredQuestions(page: Page): Promise<string[]> {
    const questions: string[] = [];

    try {
      // 1. Detect visible select dropdowns
      const selects = await page.locator('select:visible').all();
      for (const select of selects) {
        try {
          const name = (await select.getAttribute('name')) || '';
          const id = (await select.getAttribute('id')) || '';
          const label = await select.evaluate((el) => {
            const l = document.querySelector(`label[for="${el.id}"]`);
            return l?.textContent?.trim() || el.getAttribute('aria-label') || '';
          });

          const questionText = label || name || id || 'Dropdown Question';
          questions.push(`[Dropdown] ${questionText}`);
        } catch {
          // Skip individual select error
        }
      }

      // 2. Detect radio button groups
      const radioLabels = await page.evaluate(() => {
        const detected: string[] = [];
        const seenGroups = new Set<string>();

        document.querySelectorAll('input[type="radio"]:visible').forEach((radio) => {
          const input = radio as HTMLInputElement;
          const groupName = input.name || 'unnamed_group';
          if (!seenGroups.has(groupName)) {
            seenGroups.add(groupName);
            const legend = input.closest('fieldset')?.querySelector('legend')?.textContent?.trim();
            const groupLabel = legend || input.getAttribute('aria-label') || groupName;
            detected.push(`[Choice] ${groupLabel}`);
          }
        });

        return detected;
      });
      questions.push(...radioLabels);

      // 3. Detect custom comboboxes (e.g. LinkedIn / Radix / Workday)
      const comboboxes = await page.locator('[role="combobox"]:visible, [aria-haspopup="listbox"]:visible').all();
      for (const combo of comboboxes) {
        try {
          const ariaLabel = (await combo.getAttribute('aria-label')) || '';
          const text = (await combo.textContent())?.trim() || '';
          const comboLabel = ariaLabel || text || 'Custom Combobox';
          if (comboLabel.length < 80) {
            questions.push(`[Combobox] ${comboLabel}`);
          }
        } catch {
          // Skip
        }
      }

      // 4. Detect visible agreement / qualification checkboxes (for human review)
      const agreementBoxes = await page.evaluate(() => {
        const agreements: string[] = [];
        document.querySelectorAll('input[type="checkbox"]:visible').forEach((cb) => {
          const input = cb as HTMLInputElement;
          const label = document.querySelector(`label[for="${input.id}"]`);
          const text = (label?.textContent || input.parentElement?.textContent || '').trim();
          if (text) {
            agreements.push(`[Review Required] ${text.slice(0, 100)}`);
          }
        });
        return agreements;
      });
      questions.push(...agreementBoxes);

      if (questions.length > 0) {
        logger.info(`🛡️ [PopupAgent] Preserved ${questions.length} unanswered question(s) for human review.`);
      }
    } catch (err) {
      logger.warn('[PopupAgent] Error detecting form questions:', err);
    }

    return [...new Set(questions)].slice(0, 30);
  }

  /**
   * Safe wrapper maintaining backward compatibility:
   * Does NOT alter any question answers or checkboxes.
   */
  async selectFirstOptionInPopups(page: Page): Promise<number> {
    logger.info('🛡️ [PopupAgent] Auto-selection of form questions is disarmed for human-in-the-loop safety.');
    await this.detectUnansweredQuestions(page);
    return 0;
  }

  /**
   * Dismiss generic blocking popups, newsletter overlays, or notification prompts.
   */
  async dismissBlockingPopups(page: Page): Promise<boolean> {
    const dismissSelectors = [
      'button[aria-label="Dismiss"]',
      'button[aria-label="Close"]',
      'button[aria-label="close"]',
      'button:has-text("No thanks")',
      'button:has-text("Not now")',
      'button:has-text("Maybe later")',
      'button:has-text("Skip")',
      '.modal__dismiss',
      '.artdeco-modal__dismiss',
      '[data-test-modal-close-btn]',
      'button.close',
    ];

    for (const selector of dismissSelectors) {
      try {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 300 }).catch(() => false)) {
          // Ensure we don't accidentally close an active application submission modal
          const text = (await btn.textContent())?.toLowerCase() || '';
          const aria = (await btn.getAttribute('aria-label'))?.toLowerCase() || '';
          if (text.includes('no thanks') || text.includes('not now') || text.includes('maybe later') || text.includes('skip') || aria.includes('dismiss')) {
            logger.info(`🤖 [PopupAgent] Dismissing non-essential popup banner (${selector})`);
            await btn.click({ timeout: 1000 });
            await page.waitForTimeout(300);
            return true;
          }
        }
      } catch {
        // Continue
      }
    }

    return false;
  }

  /**
   * Run the safe autonomous popup resolution suite:
   * 1. Sets up dialog listeners to accept browser dialogs
   * 2. Detects and accepts cookie consent popups ("Accept All")
   * 3. Dismisses non-essential promotional overlays ("No thanks", "Maybe later")
   * 4. Scans and preserves unanswered questions without guessing or fabricating answers
   */
  async autoHandleAll(page: Page): Promise<{
    cookiesAccepted: boolean;
    optionsSelected: number;
    dismissed: boolean;
    detectedQuestions: string[];
  }> {
    this.setupDialogListener(page);

    const cookiesAccepted = await this.acceptAllCookies(page);
    const dismissed = await this.dismissBlockingPopups(page);
    const detectedQuestions = await this.detectUnansweredQuestions(page);

    return {
      cookiesAccepted,
      optionsSelected: 0,
      dismissed,
      detectedQuestions,
    };
  }
}

export const popupAgent = new PopupAgent();

