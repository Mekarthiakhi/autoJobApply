import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { initializeDatabase, getDatabase } from '../config/database.js';
import { reviewAgent } from '../services/reviewAgent.js';
import { JobRepository } from '../repositories/jobRepository.js';
import { ApplicationRepository } from '../repositories/applicationRepository.js';
import { draftHashManager } from '../execution/draftHashManager.js';
import { controlledBrowserAgent } from '../execution/controlledBrowserAgent.js';
import { ApplicationStage, ApplicationAnswer } from '../execution/types.js';

describe('Phase 10: Application Review and Controlled Execution Tests', () => {
  let jobRepo: JobRepository;
  let applicationRepo: ApplicationRepository;
  let userAId: string;
  let userBId: string;
  let sampleJobId: string;

  before(async () => {
    await initializeDatabase();
    jobRepo = new JobRepository();
    applicationRepo = new ApplicationRepository();

    const db = await getDatabase();

    // Create Candidate User A
    const emailA = `candidate_a_${Date.now()}@example.com`;
    await db.run(
      `INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)`,
      [emailA, 'hashA', 'Alice Candidate']
    );
    const userARow = await db.get(`SELECT id FROM users WHERE email = ?`, [emailA]);
    userAId = userARow.id;

    // Create Candidate User B (Attacker / Unauthorized user)
    const emailB = `candidate_b_${Date.now()}@example.com`;
    await db.run(
      `INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)`,
      [emailB, 'hashB', 'Bob Unauthorized']
    );
    const userBRow = await db.get(`SELECT id FROM users WHERE email = ?`, [emailB]);
    userBId = userBRow.id;

    // Create target job
    const job = await jobRepo.create({
      title: 'Cloud Infrastructure Architect',
      company_name: 'Stripe',
      location: 'San Francisco, CA',
      salary: '$180,000 - $240,000',
      experience_level: 'Senior',
      required_skills: ['AWS', 'Kubernetes', 'Terraform', 'Go'],
      apply_url: 'https://stripe.com/jobs/cloud-architect',
      source: 'manual',
      external_id: `stripe-job-${Date.now()}`,
      status: 'active',
      employment_type: 'Full-Time',
      posted_date: new Date(),
      job_description: 'Architect scalable cloud infrastructure across multi-region AWS environments.',
    });
    sampleJobId = job.id;
  });

  describe('1. Individual Application Review & Answer Verification', () => {
    it('creates an application in review queue with generated answers and identifies missing fields', async () => {
      const answers: ApplicationAnswer[] = [
        {
          questionId: 'q-1',
          question: 'Years of Kubernetes experience?',
          answer: '4 years',
          fieldType: 'text',
          source: 'resume',
          isConfident: true,
          confidenceScore: 0.95,
          requiresVerification: false,
        },
        {
          questionId: 'q-2',
          question: 'Desired start date?',
          answer: 'Within 2 weeks',
          fieldType: 'text',
          source: 'candidate',
          isConfident: true,
          confidenceScore: 0.90,
          requiresVerification: false,
        },
      ];

      const missingFields = [
        {
          field: 'sponsorship_needed',
          reason: 'Job requires explicit visa sponsorship declaration.',
          prompt: 'Do you require visa sponsorship now or in the future?',
        },
      ];

      const appId = await reviewAgent.queueForReview(userAId, sampleJobId, {
        matchScore: 94,
        applicationAnswers: answers,
        missingFields,
        stageStatus: ApplicationStage.READY_FOR_REVIEW,
      });

      assert.ok(appId);

      const reviewDetail = await reviewAgent.getReviewDetail(appId);
      assert.ok(reviewDetail);
      assert.strictEqual(reviewDetail.job_title, 'Cloud Infrastructure Architect');
      assert.strictEqual(reviewDetail.company_name, 'Stripe');
      assert.strictEqual(reviewDetail.match_score, 94);

      const parsedAnswers = JSON.parse(reviewDetail.application_answers);
      assert.strictEqual(parsedAnswers.length, 2);
      assert.strictEqual(parsedAnswers[0].answer, '4 years');
    });

    it('requires candidate to verify answers before approval is allowed', async () => {
      const db = await getDatabase();
      const row = await db.get(`SELECT id FROM applications WHERE user_id = ? AND job_id = ?`, [userAId, sampleJobId]);
      const appId = row.id;

      // Attempting approval without verification must fail
      await assert.rejects(
        async () => {
          await reviewAgent.approve(userAId, appId, { verifiedAnswers: false });
        },
        /Candidate must verify all application answers/
      );

      // Verify answers as candidate
      const updatedAnswers: ApplicationAnswer[] = [
        {
          questionId: 'q-1',
          question: 'Years of Kubernetes experience?',
          answer: '5 years', // candidate corrected from 4 to 5
          fieldType: 'text',
          source: 'candidate',
          isConfident: true,
          confidenceScore: 1.0,
          requiresVerification: false,
        },
      ];

      await reviewAgent.verifyAnswers(userAId, appId, updatedAnswers);

      const updated = await reviewAgent.getReviewDetail(appId);
      assert.strictEqual(updated?.candidate_verified, 1);
    });

    it('approves an individual application and binds approval to the cryptographic draft hash', async () => {
      const db = await getDatabase();
      const row = await db.get(`SELECT id FROM applications WHERE user_id = ? AND job_id = ?`, [userAId, sampleJobId]);
      const appId = row.id;

      const { draftHash, expiresAt } = await reviewAgent.approve(userAId, appId, { verifiedAnswers: true });

      assert.ok(draftHash && draftHash.length === 64, 'Must generate 64-char hex SHA-256 draft hash');
      assert.ok(expiresAt, 'Must set approval expiration timestamp');

      const approvedApp = await reviewAgent.getReviewDetail(appId);
      assert.strictEqual(approvedApp?.review_status, 'approved');
      assert.strictEqual(approvedApp?.stage_status, ApplicationStage.APPROVED);
      assert.strictEqual(approvedApp?.approved_draft_hash, draftHash);
    });
  });

  describe('2. Backend Authorization, Expiration & Invalidation Guards', () => {
    it('blocks unauthorized submission preflight from another user (Unauthorized Submission)', async () => {
      const db = await getDatabase();
      const row = await db.get(`SELECT id FROM applications WHERE user_id = ? AND job_id = ?`, [userAId, sampleJobId]);
      const appId = row.id;

      // User B attempts to verify submission of User A's application
      const checkResult = await reviewAgent.verifyApprovalBeforeSubmission(userBId, appId);

      assert.strictEqual(checkResult.isAuthorized, false);
      assert.strictEqual(checkResult.rejectionCode, 'UNAUTHORIZED');
      assert.ok(checkResult.error?.includes('unauthorized'));
    });

    it('invalidates approval when draft answers are modified (Changed Drafts)', async () => {
      const db = await getDatabase();
      const row = await db.get(`SELECT id FROM applications WHERE user_id = ? AND job_id = ?`, [userAId, sampleJobId]);
      const appId = row.id;

      // Ensure application is currently approved
      const preCheck = await reviewAgent.verifyApprovalBeforeSubmission(userAId, appId);
      assert.strictEqual(preCheck.isAuthorized, true);

      // Now candidate or agent modifies an answer
      const alteredAnswers: ApplicationAnswer[] = [
        {
          questionId: 'q-1',
          question: 'Years of Kubernetes experience?',
          answer: '8 years', // Modified after approval!
          fieldType: 'text',
          source: 'candidate',
          isConfident: true,
          confidenceScore: 1.0,
          requiresVerification: false,
        },
      ];

      // Verifying new answers invalidates the previous approval
      await reviewAgent.verifyAnswers(userAId, appId, alteredAnswers);

      const postCheck = await reviewAgent.verifyApprovalBeforeSubmission(userAId, appId);
      assert.strictEqual(postCheck.isAuthorized, false);
      assert.strictEqual(postCheck.rejectionCode, 'NOT_APPROVED');

      // Check review status reverted to ready_for_review
      const app = await reviewAgent.getReviewDetail(appId);
      assert.strictEqual(app?.review_status, 'ready_for_review');
      assert.strictEqual(app?.approved_draft_hash, null);
    });

    it('rejects submission when approval TTL has elapsed (Expired Approvals)', async () => {
      const db = await getDatabase();
      const row = await db.get(`SELECT id FROM applications WHERE user_id = ? AND job_id = ?`, [userAId, sampleJobId]);
      const appId = row.id;

      // Re-approve the application
      const { draftHash } = await reviewAgent.approve(userAId, appId, { verifiedAnswers: true });

      // Simulate expired approval (25 hours ago)
      const pastTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      await db.run(
        `UPDATE applications SET approval_expires_at = ? WHERE id = ?`,
        [pastTime, appId]
      );

      const checkResult = await reviewAgent.verifyApprovalBeforeSubmission(userAId, appId);
      assert.strictEqual(checkResult.isAuthorized, false);
      assert.strictEqual(checkResult.rejectionCode, 'APPROVAL_EXPIRED');
      assert.ok(checkResult.error?.includes('expired'));
    });

    it('rejects subsequent submissions once an application is submitted (Duplicate Submission)', async () => {
      const db = await getDatabase();
      const row = await db.get(`SELECT id FROM applications WHERE user_id = ? AND job_id = ?`, [userAId, sampleJobId]);
      const appId = row.id;

      // Mark application as SUBMITTED
      await db.run(
        `UPDATE applications SET 
          stage_status = '${ApplicationStage.SUBMITTED}', 
          status = 'applied',
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [appId]
      );

      const checkResult = await reviewAgent.verifyApprovalBeforeSubmission(userAId, appId);
      assert.strictEqual(checkResult.isAuthorized, false);
      assert.strictEqual(checkResult.rejectionCode, 'ALREADY_SUBMITTED');
      assert.ok(checkResult.error?.includes('already been submitted'));
    });

    it('disables bulk approval initially by system policy', async () => {
      await assert.rejects(
        async () => {
          await reviewAgent.approveAll(userAId);
        },
        /Bulk approval is disabled by system policy/
      );
    });
  });

  describe('3. Controlled Browser Execution & Anti-Bot Sentinel Safety', () => {
    it('detects and never checks legal agreements or consent checkboxes automatically', () => {
      const legalText1 = 'I agree to the terms and conditions and arbitration agreement.';
      const legalText2 = 'I consent to a background check under penalty of perjury.';
      const normalText = 'What is your current city of residence?';

      assert.strictEqual(controlledBrowserAgent.isLegalOrConsentText(legalText1), true);
      assert.strictEqual(controlledBrowserAgent.isLegalOrConsentText(legalText2), true);
      assert.strictEqual(controlledBrowserAgent.isLegalOrConsentText(normalText), false);
    });

    it('detects anti-bot challenges and requires candidate action without bypassing restrictions', async () => {
      // Mock Page object with Turnstile challenge
      const mockPage: any = {
        content: async () => '<html><body><div class="cf-turnstile" data-sitekey="xyz"></div></body></html>',
      };

      const challenges = await controlledBrowserAgent.detectChallenges(mockPage);
      assert.ok(challenges.includes('Cloudflare Turnstile'));
    });

    it('detects Google reCAPTCHA challenges safely', async () => {
      const mockPage: any = {
        content: async () => '<html><body><script src="https://recaptcha/api.js"></script></body></html>',
      };

      const challenges = await controlledBrowserAgent.detectChallenges(mockPage);
      assert.ok(challenges.includes('Google reCAPTCHA'));
    });

    it('detects Security Verification and OTP challenges safely', async () => {
      const mockPage: any = {
        content: async () => '<html><body><div>Please enter the code sent to your phone (One-Time Password)</div></body></html>',
      };

      const challenges = await controlledBrowserAgent.detectChallenges(mockPage);
      assert.ok(challenges.includes('SMS/Email OTP Gate'));
    });
  });
});

