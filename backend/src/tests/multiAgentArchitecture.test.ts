import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, initializeDatabase } from '../config/database.js';
import {
  AgentResponsibility,
  AgentContext,
  agentRegistry,
  multiAgentPipelineOrchestrator,
  JobDeduplicationAgentWrapper,
  JobRankingAgentWrapper,
  CoverLetterAgentWrapper,
  ApplicationPreparationAgentWrapper,
  ApplicationReviewAgentWrapper,
} from '../agents/index.js';

describe('Phase 7: Multi-Agent System Architecture Tests', () => {
  let testUserId: string;
  let testJobId: string;
  let defaultCtx: AgentContext;

  before(async () => {
    await initializeDatabase();
    const db = await getDatabase();

    // Create a deterministic test user
    const testEmail = `agent-test-${Date.now()}@example.com`;
    const userRes = await db.run(
      `INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)`,
      [testEmail, 'hashed_test_pass', 'MultiAgent Test Candidate', 'user']
    );
    const userRow = await db.get(`SELECT id FROM users WHERE email = ?`, [testEmail]);
    testUserId = userRow.id;

    // Create a deterministic test job
    const jobRes = await db.run(
      `INSERT INTO jobs (title, company_name, location, salary, job_description, source, external_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'Senior Full Stack Engineer',
        'Acme Global Solutions',
        'Remote',
        '$140,000 - $160,000',
        'We are seeking a Senior Full Stack Engineer experienced in TypeScript, React, and Node.js.',
        'test_source',
        `test-ext-${Date.now()}`
      ]
    );
    const jobRow = await db.get(`SELECT id FROM jobs WHERE source = 'test_source' ORDER BY created_at DESC LIMIT 1`);
    testJobId = jobRow.id;

    // Create a default resume version for this user
    await db.run(
      `INSERT INTO resume_versions (user_id, label, text_content, is_default) VALUES (?, ?, ?, 1)`,
      [
        testUserId,
        'Default Test Resume',
        'Senior Software Engineer with 6 years of TypeScript, React, Node.js, and SQL experience.'
      ]
    );

    defaultCtx = {
      userId: testUserId,
      workflowId: `wf-test-${uuidv4()}`,
      correlationId: `corr-test-${uuidv4()}`,
      dryRun: false,
    };
  });

  describe('1. Agent Registry & Contract Validation', () => {
    it('must have registered all 12 core responsibilities', () => {
      const registered = agentRegistry.listRegistered();
      const responsibilities = registered.map(r => r.responsibility);

      assert.ok(responsibilities.includes(AgentResponsibility.JOB_DISCOVERY));
      assert.ok(responsibilities.includes(AgentResponsibility.JOB_DEDUPLICATION));
      assert.ok(responsibilities.includes(AgentResponsibility.JOB_RANKING));
      assert.ok(responsibilities.includes(AgentResponsibility.BROWSER_AUTOMATION));
      assert.ok(responsibilities.includes(AgentResponsibility.RESUME_ANALYSIS));
      assert.ok(responsibilities.includes(AgentResponsibility.RESUME_OPTIMIZATION));
      assert.ok(responsibilities.includes(AgentResponsibility.COVER_LETTER));
      assert.ok(responsibilities.includes(AgentResponsibility.APPLICATION_PREPARATION));
      assert.ok(responsibilities.includes(AgentResponsibility.APPLICATION_REVIEW));
      assert.ok(responsibilities.includes(AgentResponsibility.NOTIFICATION));
      assert.ok(responsibilities.includes(AgentResponsibility.ANALYTICS));
    });

    it('retrieves typed agents from registry by responsibility', () => {
      const rankingAgent = agentRegistry.get(AgentResponsibility.JOB_RANKING);
      assert.ok(rankingAgent);
      assert.strictEqual(rankingAgent.name, 'JobRankingAgent');

      const coverAgent = agentRegistry.get(AgentResponsibility.COVER_LETTER);
      assert.ok(coverAgent);
      assert.strictEqual(coverAgent.name, 'CoverLetterAgent');
    });
  });

  describe('2. Job Deduplication & Normalization Agent', () => {
    it('filters out jobs that the candidate has already applied to', async () => {
      const dedupAgent = new JobDeduplicationAgentWrapper();
      const db = await getDatabase();

      // Pre-seed an existing application for testJobId
      await db.run(
        `INSERT OR IGNORE INTO applications (user_id, job_id, status, review_status) VALUES (?, ?, 'applied', 'approved')`,
        [testUserId, testJobId]
      );

      const fakeUnappliedId = 'non-existent-job-uuid-123';
      const result = await dedupAgent.execute(
        { userId: testUserId, jobIds: [testJobId, fakeUnappliedId] },
        defaultCtx
      );

      assert.strictEqual(result.status, 'SUCCESS');
      assert.ok(result.data);
      assert.strictEqual(result.data.totalChecked, 2);
      assert.strictEqual(result.data.duplicateCount, 1);
      assert.deepStrictEqual(result.data.uniqueJobIds, [fakeUnappliedId]);
    });
  });

  describe('3. Job Ranking and Matching Agent', () => {
    it('computes multidimensional score, breakdown, and skills match', async () => {
      const rankAgent = new JobRankingAgentWrapper();
      const result = await rankAgent.execute(
        {
          userId: testUserId,
          resumeText: 'Full Stack Developer with hands-on TypeScript, React, and Node.js experience.',
          job: {
            id: testJobId,
            title: 'Senior TypeScript Engineer',
            description: 'Looking for a Senior TypeScript and Node.js developer.',
            requiredSkills: ['TypeScript', 'Node.js', 'Docker'],
            location: 'Remote',
            salary: '$140,000',
          },
          threshold: 50,
        },
        defaultCtx
      );

      assert.strictEqual(result.status, 'SUCCESS');
      assert.ok(result.data);
      assert.ok(typeof result.data.score === 'number');
      assert.ok(result.data.score >= 0 && result.data.score <= 100);
      assert.ok(result.data.matchingSkills.includes('TypeScript') || result.data.matchingSkills.includes('Node.js'));
      assert.ok(result.data.breakdown.skillMatch >= 0);
      assert.ok(result.data.breakdown.titleMatch >= 0);
      assert.ok(['Apply', 'Maybe', 'Skip'].includes(result.data.recommendation));
    });
  });

  describe('4. Cover Letter Drafting Agent', () => {
    it('drafts personalized, placeholder-free letter grounded in candidate background', async () => {
      const coverAgent = new CoverLetterAgentWrapper();
      const result = await coverAgent.execute(
        {
          userId: testUserId,
          jobId: testJobId,
          jobTitle: 'Senior Full Stack Engineer',
          companyName: 'Acme Global Solutions',
          jobDescription: 'Leading high-throughput microservices using TypeScript.',
          resumeText: 'Experienced developer with 6 years in cloud web architecture.',
        },
        defaultCtx
      );

      assert.strictEqual(result.status, 'SUCCESS');
      assert.ok(result.data);
      assert.ok(result.data.content.length > 50);
      assert.ok(result.data.content.includes('Acme Global Solutions'));
      assert.ok(result.data.content.includes('Senior Full Stack Engineer'));
      // Never include placeholder brackets
      assert.strictEqual(result.data.content.includes('[Your Name]'), false);
      assert.strictEqual(result.data.content.includes('[Date]'), false);
    });
  });

  describe('5. Application Preparation & Human Review Queue Safeguards', () => {
    it('always places application drafts into pending review queue and blocks auto-apply', async () => {
      const prepAgent = new ApplicationPreparationAgentWrapper();
      const uniqueJobId = `job-prep-${Date.now()}`;

      // Insert job for this test
      const db = await getDatabase();
      await db.run(
        `INSERT INTO jobs (id, title, company_name, apply_url, source, external_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [uniqueJobId, 'Staff Platform Engineer', 'Tech Corp', 'https://example.com/apply', 'test', uniqueJobId]
      );

      const result = await prepAgent.execute(
        {
          userId: testUserId,
          jobId: uniqueJobId,
          resumeVersionId: null,
          matchScore: 88,
          warnings: ['Verify location preference'],
          scrapedQuestions: ['Years of experience with Kubernetes?'],
        },
        defaultCtx
      );

      assert.strictEqual(result.status, 'SUCCESS');
      assert.ok(result.data);
      assert.strictEqual(result.data.status, 'pending');
      assert.strictEqual(result.data.reviewStatus, 'pending');

      // Verify in DB that review_status is indeed 'pending'
      const appInDb = await db.get(`SELECT * FROM applications WHERE id = ?`, [result.data.applicationId]);
      assert.strictEqual(appInDb.review_status, 'pending');
      assert.strictEqual(appInDb.status, 'pending');
    });
  });

  describe('6. Human Approval Boundary Enforcement', () => {
    it('rejects approval without explicit human confirmation', async () => {
      const reviewAgentWrapper = new ApplicationReviewAgentWrapper();

      // Create a pending application
      const db = await getDatabase();
      const uniqueJobId = `job-review-${Date.now()}`;
      await db.run(
        `INSERT INTO jobs (id, title, company_name, source, external_id) VALUES (?, ?, ?, ?, ?)`,
        [uniqueJobId, 'DevOps Engineer', 'Cloud Corp', 'test', uniqueJobId]
      );
      const appRes = await db.run(
        `INSERT INTO applications (user_id, job_id, status, review_status) VALUES (?, ?, 'pending', 'pending')`,
        [testUserId, uniqueJobId]
      );
      const appRow = await db.get(`SELECT id FROM applications WHERE user_id = ? AND job_id = ?`, [testUserId, uniqueJobId]);

      // Attempt approval with explicitUserConfirmation: false
      const result = await reviewAgentWrapper.execute(
        {
          userId: testUserId,
          applicationId: appRow.id,
          action: 'approve',
          explicitUserConfirmation: false, // Autonomous attempt without human confirmation
        },
        defaultCtx
      );

      // Must fail to protect human-in-the-loop safety
      assert.strictEqual(result.status, 'FAILED');
      assert.ok(result.error?.includes('Explicit human approval is strictly required'));

      // Verify DB was NOT approved
      const freshApp = await db.get(`SELECT review_status FROM applications WHERE id = ?`, [appRow.id]);
      assert.strictEqual(freshApp.review_status, 'pending');
    });

    it('approves application when explicit human confirmation is provided', async () => {
      const reviewAgentWrapper = new ApplicationReviewAgentWrapper();
      const db = await getDatabase();

      const uniqueJobId = `job-review-human-${Date.now()}`;
      await db.run(
        `INSERT INTO jobs (id, title, company_name, source, external_id) VALUES (?, ?, ?, ?, ?)`,
        [uniqueJobId, 'Security Engineer', 'SecureNet', 'test', uniqueJobId]
      );
      await db.run(
        `INSERT INTO applications (user_id, job_id, status, review_status) VALUES (?, ?, 'pending', 'pending')`,
        [testUserId, uniqueJobId]
      );
      const appRow = await db.get(`SELECT id FROM applications WHERE user_id = ? AND job_id = ?`, [testUserId, uniqueJobId]);

      const result = await reviewAgentWrapper.execute(
        {
          userId: testUserId,
          applicationId: appRow.id,
          action: 'approve',
          explicitUserConfirmation: true, // Human user confirmed approval
          notes: 'Candidate approved application for submission.',
        },
        defaultCtx
      );

      assert.strictEqual(result.status, 'SUCCESS');
      assert.ok(result.data);
      assert.strictEqual(result.data.status, 'approved');
      assert.strictEqual(result.data.reviewStatus, 'approved');

      const updated = await db.get(`SELECT review_status, status FROM applications WHERE id = ?`, [appRow.id]);
      assert.strictEqual(updated.review_status, 'approved');
      assert.strictEqual(updated.status, 'applying');
    });
  });

  describe('7. End-to-End Pipeline Execution & Audit Logs', () => {
    it('executes pipeline with state tracking and writes audit logs', async () => {
      const summary = await multiAgentPipelineOrchestrator.runPipeline(testUserId, {
        limitJobs: 2,
        skipDiscovery: true,
        initialJobIds: [testJobId],
        skipBrowserInspection: true, // Skip Playwright browser launches in quick unit test
      });

      assert.ok(summary.workflowId.startsWith('wf-'));
      assert.strictEqual(summary.userId, testUserId);
      assert.strictEqual(summary.state, 'COMPLETED');
      assert.ok(summary.durationMs >= 0);
      assert.ok(typeof summary.jobsRanked === 'number');
      assert.ok(typeof summary.draftsQueuedForReview === 'number');

      // Check that activity_logs recorded agent events
      const db = await getDatabase();
      const logs = await db.all(
        `SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
        [testUserId]
      );
      assert.ok(logs.length > 0, 'Must record activity logs during multi-agent execution');
    });
  });
});
