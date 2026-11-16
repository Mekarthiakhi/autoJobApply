import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import {
  jobNormalizer,
  jobDeduplicator,
  platformRateLimiter,
  jobLifecycleManager,
  explainableScorer,
  NormalizedJob,
} from '../discovery/index.js';
import { jobRepository } from '../repositories/jobRepository.js';
import { savedSearchRepository } from '../repositories/savedSearchRepository.js';
import { getDatabase, initializeDatabase } from '../config/database.js';

describe('Phase 8: Job Discovery and Intelligence Tests', () => {

  before(async () => {
    await initializeDatabase();
  });

  describe('1. Job Normalization & Attribute Parsing', () => {
    it('normalizes raw job data into canonical NormalizedJob schema', () => {
      const raw = {
        title: 'Senior Backend Engineer - Distributed Systems ',
        company_name: 'Stripe, Inc.',
        location: 'San Francisco, CA (Remote)',
        salary: '$160,000 - $210,000 / year',
        experience_level: 'Senior Level',
        required_skills: ['Go', 'TypeScript', 'Distributed Systems', 'Kafka', 'Go'],
        job_description: 'We are looking for a Senior Backend Engineer to build payment infrastructure.',
        apply_url: 'https://stripe.com/jobs/12345?utm_source=linkedin&refId=abc&trackingId=xyz',
        source: 'linkedin',
        external_id: 'stripe-12345',
        posted_date: new Date('2026-11-10T00:00:00Z'),
      };

      const normalized = jobNormalizer.normalize(raw);

      assert.strictEqual(normalized.title, 'Senior Backend Engineer - Distributed Systems');
      assert.strictEqual(normalized.companyName, 'Stripe, Inc.');
      assert.strictEqual(normalized.isRemote, true);
      assert.strictEqual(normalized.experienceLevel, 'senior');
      assert.strictEqual(normalized.employmentType, 'Full-Time');
      assert.strictEqual(normalized.source, 'linkedin');
      assert.strictEqual(normalized.externalId, 'stripe-12345');
      // Skills should be deduplicated
      assert.strictEqual(normalized.requiredSkills.filter(s => s === 'Go').length, 1);
      // Canonical URL should have tracking parameters removed
      assert.strictEqual(normalized.canonicalUrl.includes('utm_source'), false);
      assert.strictEqual(normalized.canonicalUrl.includes('trackingId'), false);
    });

    it('parses diverse salary formats accurately', () => {
      // Annual USD range
      const sal1 = jobNormalizer.parseSalary('$130,000 - $175,000 per year');
      assert.strictEqual(sal1.min, 130000);
      assert.strictEqual(sal1.max, 175000);
      assert.strictEqual(sal1.currency, '$');
      assert.strictEqual(sal1.period, 'yearly');

      // Hourly range
      const sal2 = jobNormalizer.parseSalary('$65 - $85 / hr');
      assert.strictEqual(sal2.min, 65);
      assert.strictEqual(sal2.max, 85);
      assert.strictEqual(sal2.period, 'hourly');

      // Abbreviated 'k' format
      const sal3 = jobNormalizer.parseSalary('$90k - $120k');
      assert.strictEqual(sal3.min, 90000);
      assert.strictEqual(sal3.max, 120000);

      // INR LPA format
      const sal4 = jobNormalizer.parseSalary('₹18 - 28 LPA');
      assert.strictEqual(sal4.currency, '₹');
      assert.strictEqual(sal4.min, 1800000);
      assert.strictEqual(sal4.max, 2800000);

      // Unspecified
      const sal5 = jobNormalizer.parseSalary('Competitive');
      assert.strictEqual(sal5.raw, 'Competitive');
      assert.strictEqual(sal5.min, undefined);
    });

    it('infers experience levels and employment types correctly', () => {
      assert.strictEqual(jobNormalizer.inferExperienceLevel('Software Engineering Intern'), 'entry');
      assert.strictEqual(jobNormalizer.inferExperienceLevel('Junior React Developer'), 'entry');
      assert.strictEqual(jobNormalizer.inferExperienceLevel('Mid-Level Full Stack'), 'mid');
      assert.strictEqual(jobNormalizer.inferExperienceLevel('Senior Staff Architect'), 'lead');
      assert.strictEqual(jobNormalizer.inferExperienceLevel('VP of Engineering'), 'executive');

      assert.strictEqual(jobNormalizer.inferEmploymentType('Frontend Contractor', '6 month contract'), 'Contract');
      assert.strictEqual(jobNormalizer.inferEmploymentType('Summer Intern', 'internship program'), 'Internship');
      assert.strictEqual(jobNormalizer.inferEmploymentType('Senior Software Engineer'), 'Full-Time');
    });
  });

  describe('2. Deduplication & Cross-Platform Similarity Engine', () => {
    it('detects exact duplicates via external ID and canonical URL', () => {
      const jobA: NormalizedJob = jobNormalizer.normalize({
        title: 'Staff Platform Engineer',
        company_name: 'Datadog',
        apply_url: 'https://datadog.com/jobs/999?utm_campaign=board',
        source: 'linkedin',
        external_id: 'datadog-999',
      });

      const jobADup: NormalizedJob = jobNormalizer.normalize({
        title: 'Staff Platform Engineer',
        company_name: 'Datadog',
        apply_url: 'https://datadog.com/jobs/999?utm_campaign=newsletter',
        source: 'linkedin',
        external_id: 'datadog-999',
      });

      const result = jobDeduplicator.deduplicateBatch([jobA, jobADup]);
      assert.strictEqual(result.uniqueJobs.length, 1);
      assert.strictEqual(result.duplicates.length, 1);
      assert.strictEqual(result.duplicates[0].reason, 'exact_external_id');
    });

    it('detects fuzzy cross-platform duplicate postings (e.g. LinkedIn vs Indeed)', () => {
      // Posted on LinkedIn
      const linkedinPosting: NormalizedJob = jobNormalizer.normalize({
        title: 'Senior Full Stack Software Engineer',
        company_name: 'Acme Technologies, Inc.',
        location: 'Remote',
        apply_url: 'https://linkedin.com/jobs/view/111',
        source: 'linkedin',
        external_id: 'li-111',
      });

      // Same role cross-posted on Indeed with minor title variance
      const indeedPosting: NormalizedJob = jobNormalizer.normalize({
        title: 'Sr. Full Stack Software Engineer (Remote)',
        company_name: 'Acme Technologies LLC',
        location: 'Remote',
        apply_url: 'https://indeed.com/viewjob?jk=222',
        source: 'indeed',
        external_id: 'ind-222',
      });

      const sim = jobDeduplicator.calculateSimilarity(linkedinPosting, indeedPosting);
      assert.ok(sim >= 0.80, `Expected similarity >= 0.80, got ${sim}`);

      const result = jobDeduplicator.deduplicateBatch([linkedinPosting, indeedPosting]);
      assert.strictEqual(result.uniqueJobs.length, 1);
      assert.strictEqual(result.duplicates.length, 1);
      assert.strictEqual(result.duplicates[0].reason, 'fuzzy_cross_platform');
    });
  });

  describe('3. Rate Limiting & Anti-Bot Sentinel Safety', () => {
    it('detects Cloudflare Turnstile / anti-bot challenges and does not attempt bypass', () => {
      const challengeHtml = '<html><head><title>Just a moment...</title></head><body><div class="cf-turnstile"></div></body></html>';
      const result = platformRateLimiter.detectBotChallenge(challengeHtml);

      assert.strictEqual(result.isChallenged, true);
      assert.strictEqual(result.challengeType, 'cloudflare_turnstile');
    });

    it('detects Google reCAPTCHA challenges safely', () => {
      const captchaHtml = '<div class="g-recaptcha" data-sitekey="xyz"></div>';
      const result = platformRateLimiter.detectBotChallenge(captchaHtml);

      assert.strictEqual(result.isChallenged, true);
      assert.strictEqual(result.challengeType, 'recaptcha');
    });

    it('detects LinkedIn security challenges safely', () => {
      const authwallHtml = '<div>Please solve this challenge to continue. Security verification.</div>';
      const result = platformRateLimiter.detectBotChallenge(authwallHtml);

      assert.strictEqual(result.isChallenged, true);
      assert.strictEqual(result.challengeType, 'authwall');
    });

    it('tracks errors and computes backoff delay', () => {
      const backoff = platformRateLimiter.recordError('linkedin');
      assert.ok(backoff >= 1000);
      platformRateLimiter.recordSuccess('linkedin');
    });
  });

  describe('4. Explainable Multi-Dimensional Job Scoring Engine', () => {
    it('scores a job with granular explanation across all 7 dimensions', () => {
      const job: NormalizedJob = jobNormalizer.normalize({
        title: 'Senior TypeScript Developer',
        company_name: 'TechWave Solutions',
        location: 'Remote',
        salary: '$150,000 - $180,000',
        experience_level: 'senior',
        required_skills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL', 'Docker'],
        job_description: 'Looking for a Senior TypeScript Developer to build microservices.',
        apply_url: 'https://example.com/apply',
        source: 'career_page',
        external_id: 'test-score-1',
        posted_date: new Date().toISOString(), // Fresh
      });

      const profile = {
        skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS'],
        experienceLevel: 'senior' as const,
        targetRoles: ['TypeScript Developer', 'Software Engineer'],
        targetLocations: ['Remote'],
        prefersRemote: true,
        minSalary: 140000,
        preferredEmploymentType: 'Full-Time' as const,
      };

      const result = explainableScorer.scoreJob(job, profile);

      assert.ok(result.totalScore >= 75);
      assert.strictEqual(result.recommendation, 'Apply');
      assert.strictEqual(result.factors.length, 7);

      // Verify all 7 factor names
      const factorNames = result.factors.map(f => f.name);
      assert.ok(factorNames.includes('Skills Match'));
      assert.ok(factorNames.includes('Experience Match'));
      assert.ok(factorNames.includes('Location & Remote Preference'));
      assert.ok(factorNames.includes('Salary Expectation'));
      assert.ok(factorNames.includes('Job Title Relevance'));
      assert.ok(factorNames.includes('Employment Type'));
      assert.ok(factorNames.includes('Freshness'));

      // Verify explanations are present and human-readable
      for (const factor of result.factors) {
        assert.ok(factor.reason.length > 5, `Factor ${factor.name} must have explanatory reason`);
        assert.ok(factor.score >= 0 && factor.score <= factor.maxScore);
      }

      assert.ok(result.summary.includes('Job scored'));
    });
  });

  describe('5. Stale & Expired Job Lifecycle Management', () => {
    it('marks old jobs as stale and expired based on last_seen_at', async () => {
      const db = await getDatabase();
      const ancientJobId = `job-ancient-${Date.now()}`;
      const staleJobId = `job-stale-${Date.now()}`;

      // Insert job not seen in 35 days (should be expired)
      await db.run(
        `INSERT INTO jobs (id, title, company_name, source, external_id, status, last_seen_at)
         VALUES (?, ?, ?, ?, ?, 'active', datetime('now', '-35 days'))`,
        [ancientJobId, 'Ancient Role', 'Old Corp', 'test', ancientJobId]
      );

      // Insert job not seen in 18 days (should be stale)
      await db.run(
        `INSERT INTO jobs (id, title, company_name, source, external_id, status, last_seen_at)
         VALUES (?, ?, ?, ?, ?, 'active', datetime('now', '-18 days'))`,
        [staleJobId, 'Stale Role', 'Stale Corp', 'test', staleJobId]
      );

      const sweep = await jobLifecycleManager.sweepJobLifecycle(14, 30);
      assert.ok(sweep.expiredCount >= 1);
      assert.ok(sweep.staleCount >= 1);

      const ancientJob = await jobRepository.findById(ancientJobId);
      assert.strictEqual(ancientJob?.status, 'expired');

      const staleJob = await jobRepository.findById(staleJobId);
      assert.strictEqual(staleJob?.status, 'stale');

      // Test touchJob reactivates stale job
      await jobLifecycleManager.touchJob(staleJobId);
      const reactivated = await jobRepository.findById(staleJobId);
      assert.strictEqual(reactivated?.status, 'active');
    });
  });

  describe('6. Saved Searches & Enhanced Job Filtering', () => {
    it('creates, retrieves, and filters jobs via SavedSearchRepository', async () => {
      const db = await getDatabase();
      const testEmail = `saved-search-${Date.now()}@example.com`;
      await db.run(`INSERT INTO users (email, password_hash) VALUES (?, ?)`, [testEmail, 'hashed']);
      const user = await db.get(`SELECT id FROM users WHERE email = ?`, [testEmail]);

      // Create saved search
      const saved = await savedSearchRepository.create(user.id, {
        keyword: 'Cloud Architect',
        location: 'Remote',
        experience: 'Senior',
        remote: true,
      });

      assert.ok(saved.id);
      assert.strictEqual(saved.keyword, 'Cloud Architect');
      assert.strictEqual(saved.remote, 1);

      // List saved searches
      const list = await savedSearchRepository.findByUserId(user.id);
      assert.ok(list.length >= 1);
      assert.strictEqual(list[0].id, saved.id);

      // Test rich multi-field filtering on JobRepository
      const searchRes = await jobRepository.findWithFilters({
        keyword: 'Senior',
        remoteOnly: true,
        limit: 10,
      });

      assert.ok(typeof searchRes.total === 'number');
      assert.ok(Array.isArray(searchRes.jobs));

      // Clean up saved search
      const deleted = await savedSearchRepository.delete(saved.id, user.id);
      assert.strictEqual(deleted, true);
    });
  });
});

