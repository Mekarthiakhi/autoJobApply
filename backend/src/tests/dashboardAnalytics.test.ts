import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { initializeDatabase, getDatabase } from '../config/database.js';
import { analyticsService } from '../services/analyticsService.js';
import { JobRepository } from '../repositories/jobRepository.js';
import { ActivityLogRepository } from '../repositories/activityLogRepository.js';

describe('Phase 11: Dashboard and Analytics Intelligence Tests', () => {
  let jobRepo: JobRepository;
  let activityRepo: ActivityLogRepository;
  let testUserId: string;
  let testUser2Id: string;
  let jobLinkedIn: any;
  let jobIndeed: any;
  let jobGlassdoor: any;

  before(async () => {
    await initializeDatabase();
    jobRepo = new JobRepository();
    activityRepo = new ActivityLogRepository();
    const db = await getDatabase();

    // Create primary test user
    const email1 = `analytics_user_${Date.now()}@example.com`;
    await db.run(
      `INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)`,
      [email1, 'hashed_pass', 'Analytics Candidate']
    );
    const userRow1 = await db.get(`SELECT id FROM users WHERE email = ?`, [email1]);
    testUserId = userRow1.id;

    // Create second user for isolation checks
    const email2 = `analytics_user2_${Date.now()}@example.com`;
    await db.run(
      `INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)`,
      [email2, 'hashed_pass', 'Second Candidate']
    );
    const userRow2 = await db.get(`SELECT id FROM users WHERE email = ?`, [email2]);
    testUser2Id = userRow2.id;

    // Insert real test jobs across diverse platforms
    jobLinkedIn = await jobRepo.create({
      title: 'Senior Frontend Engineer',
      company_name: 'Acme Cloud Inc',
      location: 'San Francisco, CA',
      salary: '$160k - $190k',
      experience_level: 'Senior',
      required_skills: ['React', 'TypeScript', 'Node.js', 'Tailwind'],
      posted_date: new Date().toISOString(),
      status: 'active',
      source: 'linkedin',
      external_id: `ext_li_${Date.now()}`,
      job_description: 'React TypeScript Node.js Tailwind',
      apply_url: 'https://linkedin.com/jobs/view/101',
    });

    jobIndeed = await jobRepo.create({
      title: 'Staff Fullstack Architect',
      company_name: 'Beta Global Tech',
      location: 'Remote',
      salary: '$180k - $220k',
      experience_level: 'Staff',
      required_skills: ['Architecture', 'Fullstack', 'Go'],
      posted_date: new Date().toISOString(),
      status: 'active',
      source: 'indeed',
      external_id: `ext_ind_${Date.now()}`,
      job_description: 'Fullstack systems distributed architecture',
      apply_url: 'https://indeed.com/viewjob?jk=102',
    });

    jobGlassdoor = await jobRepo.create({
      title: 'Backend Platform Engineer',
      company_name: 'Acme Cloud Inc',
      location: 'New York, NY',
      salary: '$150k - $175k',
      experience_level: 'Mid',
      required_skills: ['Go', 'Python', 'SQLite'],
      posted_date: new Date().toISOString(),
      status: 'active',
      source: 'glassdoor',
      external_id: `ext_gd_${Date.now()}`,
      job_description: 'Backend Go Python Microservices SQLite',
      apply_url: 'https://glassdoor.com/job/103',
    });

    // Seed match scores
    await db.run(
      `INSERT INTO match_scores (user_id, job_id, match_score, matching_skills, recommendation)
       VALUES (?, ?, ?, ?, ?)`,
      [testUserId, jobLinkedIn.id, 88, '["React", "TypeScript"]', 'Strong Apply']
    );
    await db.run(
      `INSERT INTO match_scores (user_id, job_id, match_score, matching_skills, recommendation)
       VALUES (?, ?, ?, ?, ?)`,
      [testUserId, jobIndeed.id, 92, '["Architecture", "Fullstack"]', 'Strong Apply']
    );
    await db.run(
      `INSERT INTO match_scores (user_id, job_id, match_score, matching_skills, recommendation)
       VALUES (?, ?, ?, ?, ?)`,
      [testUserId, jobGlassdoor.id, 55, '["SQLite"]', 'Low Match']
    );

    // Seed Applications in various Phase 10 stages:
    // App 1: Submitted & Interview Scheduled (LinkedIn)
    await db.run(
      `INSERT INTO applications (
        user_id, job_id, stage_status, status, interview_scheduled, candidate_verified,
        applied_at, created_at
      ) VALUES (?, ?, 'SUBMITTED', 'interview', 1, 1, datetime('now', '-2 hours'), datetime('now', '-6 hours'))`,
      [testUserId, jobLinkedIn.id]
    );

    // App 2: Ready for Review (Indeed)
    await db.run(
      `INSERT INTO applications (
        user_id, job_id, stage_status, status, review_status, candidate_verified,
        application_answers, created_at
      ) VALUES (?, ?, 'READY_FOR_REVIEW', 'pending', 'pending', 0, '[]', datetime('now', '-3 hours'))`,
      [testUserId, jobIndeed.id]
    );

    // App 3: Needs Candidate Input (Glassdoor)
    await db.run(
      `INSERT INTO applications (
        user_id, job_id, stage_status, status, review_status, candidate_verified,
        missing_fields, created_at
      ) VALUES (?, ?, 'NEEDS_CANDIDATE_INPUT', 'pending', 'pending', 0, 
        '[{"field":"visa_status","question":"Do you require sponsorship?"}]',
        datetime('now', '-1 hour')
      )`,
      [testUserId, jobGlassdoor.id]
    );

    // Seed Activity Logs for multi-agent tracking
    await activityRepo.create(testUserId, 'job_discovery', {
      jobId: jobLinkedIn.id,
      details: { discoveredCount: 5, platform: 'linkedin' },
      status: 'success',
    });
    await activityRepo.create(testUserId, 'match_scoring', {
      jobId: jobLinkedIn.id,
      details: { score: 88 },
      status: 'success',
    });
    await activityRepo.create(testUserId, 'form_preparation', {
      jobId: jobIndeed.id,
      details: { answersPrepared: 4 },
      status: 'success',
    });
    await activityRepo.create(testUserId, 'submission_executed', {
      jobId: jobLinkedIn.id,
      details: { submissionId: 'sub_123', confirmationUrl: 'https://linkedin.com/conf' },
      status: 'success',
    });
    await activityRepo.create(testUserId, 'controlled_browser_execution', {
      jobId: jobGlassdoor.id,
      details: { error: 'Anti-bot challenge encountered: Cloudflare Turnstile' },
      status: 'failed',
    });
  });

  describe('1. Eleven Core Metrics Grounded in Real Database Records', () => {
    it('accurately computes all 11 core metrics for user without mock data', async () => {
      const metrics = await analyticsService.getDashboardMetrics(testUserId);

      // Metric 1: Total jobs discovered
      assert.ok(metrics.totalJobsDiscovered >= 3, 'Must discover at least 3 jobs');

      // Metric 2: Jobs shortlisted (score >= 70 or has application)
      assert.ok(metrics.jobsShortlisted >= 2, 'Must count shortlisted jobs with match >= 70%');

      // Metric 3: Applications prepared (all 3 seeded apps have drafts)
      assert.strictEqual(metrics.applicationsPrepared, 3, 'Prepared count must match real DB records');

      // Metric 4: Applications awaiting review (App 2 is READY_FOR_REVIEW, App 3 is NEEDS_CANDIDATE_INPUT)
      assert.strictEqual(metrics.applicationsAwaitingReview, 2, 'Awaiting review must count pending drafts');

      // Metric 5: Applications approved
      assert.strictEqual(metrics.applicationsApproved, 0, 'No apps currently in APPROVED state without submission');

      // Metric 6: Applications submitted (App 1 is SUBMITTED)
      assert.strictEqual(metrics.applicationsSubmitted, 1, 'Submitted count must be 1');

      // Metric 7: Failed applications (None marked failed in applications table yet)
      assert.strictEqual(metrics.failedApplications, 0, 'Failed applications must accurately reflect stage');

      // Metric 8: Interview invitations (App 1 has interview_scheduled = 1)
      assert.strictEqual(metrics.interviewInvitations, 1, 'Interview count must be 1');

      // Metric 9: Rejection rate (0 rejections currently)
      assert.strictEqual(metrics.rejectionRate, 0, 'Rejection rate must be 0% when zero rejections');

      // Metric 10: Application conversion rate (1 interview out of 1 submitted = 100%)
      assert.strictEqual(metrics.applicationConversionRate, 100, 'Conversion rate must be 100%');

      // Metric 11: Average time from discovery to submission
      assert.ok(metrics.avgTimeDiscoveryToSubmissionHours !== null, 'Avg hours must be computed from real timestamps');
      assert.ok(metrics.avgTimeDiscoveryToSubmissionFormatted.length > 0, 'Must provide human-readable formatted time');
    });

    it('isolates metrics by user_id and does not bleed records from user B', async () => {
      const metricsB = await analyticsService.getDashboardMetrics(testUser2Id);
      assert.strictEqual(metricsB.applicationsPrepared, 0, 'User B must have 0 prepared applications');
      assert.strictEqual(metricsB.applicationsSubmitted, 0, 'User B must have 0 submitted applications');
      assert.strictEqual(metricsB.interviewInvitations, 0, 'User B must have 0 interviews');
    });
  });

  describe('2. Pipeline Filtering by Platform, Company, Role, and Stage', () => {
    it('filters metrics by platform / source', async () => {
      const linkedInMetrics = await analyticsService.getDashboardMetrics(testUserId, { platform: 'linkedin' });
      assert.strictEqual(linkedInMetrics.applicationsSubmitted, 1, 'LinkedIn has 1 submitted application');
      assert.strictEqual(linkedInMetrics.interviewInvitations, 1, 'LinkedIn has 1 interview');

      const indeedMetrics = await analyticsService.getDashboardMetrics(testUserId, { platform: 'indeed' });
      assert.strictEqual(indeedMetrics.applicationsSubmitted, 0, 'Indeed has 0 submitted applications');
      assert.strictEqual(indeedMetrics.applicationsAwaitingReview, 1, 'Indeed has 1 awaiting review application');
    });

    it('filters metrics by company name', async () => {
      const acmeMetrics = await analyticsService.getDashboardMetrics(testUserId, { company: 'Acme Cloud' });
      assert.strictEqual(acmeMetrics.applicationsPrepared, 2, 'Acme has 2 prepared applications');

      const betaMetrics = await analyticsService.getDashboardMetrics(testUserId, { company: 'Beta Global' });
      assert.strictEqual(betaMetrics.applicationsPrepared, 1, 'Beta Global has 1 prepared application');
    });

    it('filters metrics by job role / title keyword', async () => {
      const frontendMetrics = await analyticsService.getDashboardMetrics(testUserId, { role: 'Frontend' });
      assert.strictEqual(frontendMetrics.applicationsSubmitted, 1, 'Frontend engineer role has 1 submitted application');

      const architectMetrics = await analyticsService.getDashboardMetrics(testUserId, { role: 'Architect' });
      assert.strictEqual(architectMetrics.applicationsAwaitingReview, 1, 'Architect role is awaiting review');
    });

    it('filters metrics by application stage status', async () => {
      const reviewStageMetrics = await analyticsService.getDashboardMetrics(testUserId, { status: 'READY_FOR_REVIEW' });
      assert.strictEqual(reviewStageMetrics.applicationsAwaitingReview, 1);
      assert.strictEqual(reviewStageMetrics.applicationsSubmitted, 0);
    });
  });

  describe('3. Job-Source Performance Comparisons', () => {
    it('computes breakdown across platforms with real conversion rates', async () => {
      const sources = await analyticsService.getSourcePerformance(testUserId);
      assert.ok(sources.length >= 2, 'Must return performance for active job sources');

      const linkedInSource = sources.find(s => s.source === 'linkedin');
      assert.ok(linkedInSource, 'Must include linkedin in source performance');
      assert.strictEqual(linkedInSource.submittedCount, 1);
      assert.strictEqual(linkedInSource.interviewsCount, 1);
      assert.strictEqual(linkedInSource.conversionRate, 100);

      const indeedSource = sources.find(s => s.source === 'indeed');
      assert.ok(indeedSource, 'Must include indeed in source performance');
      assert.strictEqual(indeedSource.preparedCount, 1);
      assert.strictEqual(indeedSource.submittedCount, 0);
      assert.strictEqual(indeedSource.conversionRate, 0);
    });
  });

  describe('4. Multi-Agent Execution Observability and Error Tracking', () => {
    it('aggregates agent runs, errors, and computes error rates accurately', async () => {
      const agentMetrics = await analyticsService.getAgentExecutionMetrics(testUserId);
      assert.strictEqual(agentMetrics.totalExecutions, 5, 'Total agent executions must be 5');
      assert.strictEqual(agentMetrics.successfulExecutions, 4, 'Successful runs must be 4');
      assert.strictEqual(agentMetrics.failedExecutions, 1, 'Failed runs must be 1');
      assert.strictEqual(agentMetrics.errorRate, 20, 'Error rate must be 20% (1/5)');

      // Verify breakdown by action
      const browserAgent = agentMetrics.byAgent.find(a => a.agent === 'controlled_browser_execution');
      assert.ok(browserAgent, 'Must track browser execution agent');
      assert.strictEqual(browserAgent.runs, 1);
      assert.strictEqual(browserAgent.errors, 1);
      assert.strictEqual(browserAgent.successRate, 0);

      // Verify recent errors log
      assert.strictEqual(agentMetrics.recentErrors.length, 1);
      assert.ok(
        JSON.stringify(agentMetrics.recentErrors[0].details).includes('Cloudflare Turnstile'),
        'Must capture anti-bot challenge error message in details'
      );
    });
  });

  describe('5. Pending Candidate Actions Detection', () => {
    it('identifies applications requiring candidate review and missing field input', async () => {
      const pendingActions = await analyticsService.getPendingCandidateActions(testUserId);
      assert.strictEqual(pendingActions.length, 2, 'Must detect 2 pending candidate actions');

      const needsInput = pendingActions.find(a => a.actionRequired === 'PROVIDE_MISSING_INFO');
      assert.ok(needsInput, 'Must detect PROVIDE_MISSING_INFO action');
      assert.strictEqual(needsInput.missingFieldsCount, 1);
      assert.strictEqual(needsInput.jobTitle, 'Backend Platform Engineer');

      const needsReview = pendingActions.find(a => a.actionRequired === 'VERIFY_ANSWERS');
      assert.ok(needsReview, 'Must detect VERIFY_ANSWERS action');
      assert.strictEqual(needsReview.jobTitle, 'Staff Fullstack Architect');
    });
  });

  describe('6. Query Optimization, History and Pagination', () => {
    it('paginates workflow history without duplicates', async () => {
      const page1 = await analyticsService.getRecentWorkflowHistory(testUserId, 2, 0);
      assert.strictEqual(page1.items.length, 2);
      assert.strictEqual(page1.total, 5);

      const page2 = await analyticsService.getRecentWorkflowHistory(testUserId, 2, 2);
      assert.strictEqual(page2.items.length, 2);

      // Ensure no duplicate IDs across pages
      const idsPage1 = page1.items.map(i => i.id);
      const idsPage2 = page2.items.map(i => i.id);
      for (const id of idsPage1) {
        assert.ok(!idsPage2.includes(id), `Item ${id} should not appear on both page 1 and page 2`);
      }
    });

    it('paginates ActivityLogRepository by user and counts accurately', async () => {
      const logs = await activityRepo.findByUserId(testUserId, { limit: 3, offset: 0 });
      const total = await activityRepo.countByUserId(testUserId);
      assert.strictEqual(logs.length, 3);
      assert.strictEqual(total, 5);
    });
  });
});
