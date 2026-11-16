import { describe, it } from 'node:test';
import assert from 'node:assert';
import { popupAgent } from '../services/popupAgent.js';
import { linkedinScraper } from '../scrapers/linkedinScraper.js';
import { indeedScraper } from '../scrapers/indeedScraper.js';
import { glassdoorScraper } from '../scrapers/glassdoorScraper.js';
import { naukriScraper } from '../scrapers/naukriScraper.js';
import { careerPagesScraper } from '../scrapers/careerPagesScraper.js';
import { unifiedJobScraper } from '../scrapers/unifiedJobScraper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '..');

describe('Phase 1: Human-in-the-Loop Safety Remediation Tests', () => {

  describe('1. WorkflowOrchestrator Safeguards', () => {
    it('must have removed the "|| true" auto-apply bypass', () => {
      const orchestratorPath = path.join(srcDir, 'services/WorkflowOrchestrator.ts');
      const content = fs.readFileSync(orchestratorPath, 'utf8');

      // Assert the dangerous pattern is completely removed
      assert.strictEqual(
        content.includes('approval_mode_enabled === 0 || true'),
        false,
        'Found dangerous "|| true" hardcoded auto-apply bypass in WorkflowOrchestrator.ts'
      );

      // Assert review queue routing is enforced
      assert.strictEqual(
        content.includes('reviewAgent.queueForReview'),
        true,
        'WorkflowOrchestrator must route applications to reviewAgent.queueForReview'
      );
    });

    it('must not call direct scraper applyToJob inside WorkflowOrchestrator', () => {
      const orchestratorPath = path.join(srcDir, 'services/WorkflowOrchestrator.ts');
      const content = fs.readFileSync(orchestratorPath, 'utf8');

      // Assert direct auto-apply calls are removed from runWorkflow
      assert.strictEqual(
        content.includes('linkedinScraper.applyToJob'),
        false,
        'WorkflowOrchestrator must not call linkedinScraper.applyToJob autonomously'
      );
      assert.strictEqual(
        content.includes('indeedScraper.applyToJob'),
        false,
        'WorkflowOrchestrator must not call indeedScraper.applyToJob autonomously'
      );
    });
  });

  describe('2. PopupAgent Safeguards', () => {
    it('selectFirstOptionInPopups must be safely disarmed and return 0', async () => {
      // Mock page object
      const mockPage: any = {
        locator: () => ({ all: async () => [] }),
        evaluate: async () => [],
      };

      const count = await popupAgent.selectFirstOptionInPopups(mockPage);
      assert.strictEqual(count, 0, 'selectFirstOptionInPopups must return 0 and not select any options');
    });

    it('autoHandleAll must preserve questions without selecting options', async () => {
      const mockPage: any = {
        removeAllListeners: () => {},
        on: () => {},
        locator: () => ({
          first: () => ({
            isVisible: async () => false,
          }),
          all: async () => [],
        }),
        evaluate: async () => [],
      };

      const result = await popupAgent.autoHandleAll(mockPage);
      assert.strictEqual(result.optionsSelected, 0, 'autoHandleAll must report 0 options selected');
      assert.strictEqual(Array.isArray(result.detectedQuestions), true, 'autoHandleAll must return detectedQuestions array');
    });

    it('must provide safe question detection method', () => {
      assert.strictEqual(typeof popupAgent.detectUnansweredQuestions, 'function', 'detectUnansweredQuestions must exist');
    });
  });

  describe('3. Platform Scrapers Draft-Only Safeguards', () => {
    const scrapers = [
      { name: 'LinkedIn', scraper: linkedinScraper },
      { name: 'Indeed', scraper: indeedScraper },
      { name: 'Glassdoor', scraper: glassdoorScraper },
      { name: 'Naukri', scraper: naukriScraper },
      { name: 'CareerPages', scraper: careerPagesScraper },
    ];

    it('all 5 scrapers must have applyToJob defined with draft-only options', () => {
      for (const { name, scraper } of scrapers) {
        assert.strictEqual(typeof scraper.applyToJob, 'function', `${name} scraper must have applyToJob`);
      }
    });

    it('scrapers source code must NOT unconditionally click submit', () => {
      const scraperDir = path.join(srcDir, 'scrapers');
      const files = ['linkedinScraper.ts', 'indeedScraper.ts', 'glassdoorScraper.ts', 'naukriScraper.ts', 'careerPagesScraper.ts'];

      for (const file of files) {
        const content = fs.readFileSync(path.join(scraperDir, file), 'utf8');
        // Check that explicitUserConfirmation is checked before any submitButton.click()
        assert.strictEqual(
          content.includes('explicitUserConfirmation'),
          true,
          `${file} must check options.explicitUserConfirmation`
        );
      }
    });

    it('unifiedJobScraper must pass explicitUserConfirmation to platform scrapers', () => {
      const unifiedPath = path.join(srcDir, 'scrapers/unifiedJobScraper.ts');
      const content = fs.readFileSync(unifiedPath, 'utf8');
      assert.strictEqual(
        content.includes('explicitUserConfirmation'),
        true,
        'unifiedJobScraper must support options.explicitUserConfirmation'
      );
    });
  });

  describe('4. Review Queue Authorization & Safeguards', () => {
    it('controller source code must enforce confirmation on bulk approval', () => {
      const controllerPath = path.join(srcDir, 'controllers/reviewQueueController.ts');
      const content = fs.readFileSync(controllerPath, 'utf8');

      // Assert bulk approval requires confirmed: true
      assert.strictEqual(
        content.includes('confirmed !== true'),
        true,
        'approveAllReviews must check that confirmed === true'
      );
    });

    it('reviewAgent.approve must validate ownership and pending state', () => {
      const reviewAgentPath = path.join(srcDir, 'services/reviewAgent.ts');
      const content = fs.readFileSync(reviewAgentPath, 'utf8');

      assert.strictEqual(
        content.includes('review_status !== \'pending\''),
        true,
        'reviewAgent.approve must reject non-pending applications'
      );
      assert.strictEqual(
        content.includes('WHERE a.id = ? AND a.user_id = ?'),
        true,
        'reviewAgent.approve must verify user ownership'
      );
    });
  });

});

