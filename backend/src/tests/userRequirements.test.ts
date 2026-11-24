import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { initializeDatabase, closeDatabase, getDatabase } from '../config/database.js';
import { JobRepository } from '../repositories/jobRepository.js';
import { ensureCandidateJobMatches } from '../controllers/jobController.js';
import { applyToJob, batchApplyToJobs } from '../controllers/applicationController.js';
import { getCardDetails } from '../controllers/dashboardController.js';

describe('User Core Requirements End-to-End Validation', () => {
  let jobRepo: JobRepository;
  let testUserId: string;
  let testJobId1: string;
  let testJobId2: string;

  before(async () => {
    await initializeDatabase();
    jobRepo = new JobRepository();

    const db = await getDatabase();
    const testEmail = `req_test_${Date.now()}@example.com`;
    await db.run(
      `INSERT INTO users (email, password_hash, full_name, phone_number) VALUES (?, ?, ?, ?)`,
      [testEmail, 'hashed_pw', 'Alex Johnson', '+15551234567']
    );
    const userRow = await db.get(`SELECT id FROM users WHERE email = ?`, [testEmail]);
    testUserId = userRow.id;

    // Create a base resume for user
    const sampleResume = `
Alex Johnson
alex@example.com | San Francisco, CA

SUMMARY
Senior Full Stack Engineer specializing in React, Node.js, TypeScript, and PostgreSQL.

SKILLS
React, TypeScript, Node.js, Express, PostgreSQL, Docker, AWS, GraphQL

EXPERIENCE
Lead Engineer at TechCorp (2021 - Present)
- Built high performance web applications with React and TypeScript.
- Designed scalable REST and GraphQL APIs with Node.js and PostgreSQL.
    `;

    await db.run(
      `INSERT INTO resumes (user_id, file_path, file_name, skills, text_content)
       VALUES (?, ?, ?, ?, ?)`,
      [
        testUserId,
        '/resumes/alex.pdf',
        'alex.pdf',
        JSON.stringify(['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'AWS']),
        sampleResume,
      ]
    );

    // Create 2 test jobs: one matching candidate skills, one completely unrelated
    const matchingJob = await jobRepo.create({
      title: 'Senior React & TypeScript Engineer',
      company_name: 'Frontend Innovations',
      job_description: 'Looking for a Senior React Engineer with deep knowledge of TypeScript, Node.js, and modern CSS.',
      required_skills: JSON.stringify(['React', 'TypeScript', 'Node.js', 'Frontend Architecture']),
      experience_level: 'Senior',
      source: 'DirectTest',
      apply_url: 'https://example.com/apply/frontend',
      location: 'Remote',
      external_id: `ext_${Date.now()}_1`,
      status: 'active',
    } as any);
    testJobId1 = matchingJob.id;

    const unrelatedJob = await jobRepo.create({
      title: 'Senior Petroleum Drilling Engineer',
      company_name: 'DeepSea Energy',
      job_description: 'Offshore oil drilling operations, hydraulic equipment, and geological reservoir surveying.',
      required_skills: JSON.stringify(['Petroleum Engineering', 'Drilling Rig Operations', 'Geology', 'Hydraulics']),
      experience_level: 'Senior',
      source: 'DirectTest',
      apply_url: 'https://example.com/apply/petroleum',
      location: 'Houston, TX',
      external_id: `ext_${Date.now()}_2`,
      status: 'active',
    } as any);
    testJobId2 = unrelatedJob.id;
  });

  after(async () => {
    await closeDatabase();
  });

  it('Requirement 1: Based on profile, jobs should be scored and filtered', async () => {
    // 1. Run profile match scoring
    const matchResult = await ensureCandidateJobMatches(testUserId);
    assert.strictEqual(matchResult.hasResume, true, 'Candidate should be recognized as having a resume');
    assert.ok(matchResult.skills.includes('React'), 'Candidate profile skills should include React');

    // 2. Query jobs with profileMatchedOnly = true
    const result = await jobRepo.findWithFilters({
      profileMatchedOnly: true,
      limit: 50,
    }, testUserId);
    const matchedJobs = result.jobs;

    assert.ok(matchedJobs.length > 0, 'Should return matching jobs');
    const matchedReactJob = matchedJobs.find((j: any) => j.id === testJobId1);
    assert.ok(matchedReactJob, 'React/TypeScript job should be included in matched jobs');
    assert.ok(
      (matchedReactJob as any).match_score >= 50,
      `Match score for relevant job should be >= 50, got ${(matchedReactJob as any).match_score}`
    );

    // 3. The petroleum drilling job should not pass profileMatchedOnly filter
    const petroleumJobInMatched = matchedJobs.find((j: any) => j.id === testJobId2);
    assert.strictEqual(
      petroleumJobInMatched,
      undefined,
      'Unrelated petroleum job should not pass profileMatchedOnly filter'
    );
  });

  it('Requirement 2: When applying for a job, it should tailor resume and apply', async () => {
    const db = await getDatabase();

    let responseStatusCode = 200;
    let responseBody: any = null;

    const mockReq: any = {
      userId: testUserId,
      body: {
        jobId: testJobId1,
        matchScore: 94,
      },
    };

    const mockRes: any = {
      status(code: number) {
        responseStatusCode = code;
        return this;
      },
      json(data: any) {
        responseBody = data;
        return this;
      },
    };

    // Execute applyToJob controller
    await applyToJob(mockReq, mockRes);

    assert.strictEqual(responseStatusCode, 201, `Apply should return 201 Created, got ${responseStatusCode}`);
    assert.ok(responseBody, 'Response body should not be empty');
    assert.ok(responseBody.message.includes('tailored'), 'Response message should mention resume tailoring');
    assert.ok(responseBody.application, 'Response should contain application object');

    const createdAppId = responseBody.application.id;
    const tailoredVersionId = responseBody.application.resume_version_id;

    // Verify tailored resume was persisted in resume_versions table
    const tailoredRow = await db.get<any>(
      `SELECT * FROM resume_versions WHERE id = ? AND user_id = ?`,
      [tailoredVersionId, testUserId]
    );

    assert.ok(tailoredRow, 'Tailored resume must be stored in resume_versions');
    assert.strictEqual(tailoredRow.target_job_id, testJobId1, 'Tailored resume must be linked to target job ID');
    assert.ok(tailoredRow.label.includes('Tailored:'), 'Tailored resume label must indicate tailoring');
    assert.ok(tailoredRow.text_content.includes('Target Role: Senior React & TypeScript Engineer'), 'Tailored content must reflect target position');

    // Verify cover letter was generated
    const coverRow = await db.get<any>(
      `SELECT * FROM cover_letters WHERE user_id = ? AND job_id = ?`,
      [testUserId, testJobId1]
    );
    assert.ok(coverRow, 'Tailored cover letter must be stored in cover_letters');
    assert.ok(coverRow.content.includes('Frontend Innovations'), 'Cover letter must mention company name');

    // Verify application record in database
    const appRow = await db.get<any>(
      `SELECT * FROM applications WHERE id = ?`,
      [createdAppId]
    );
    assert.ok(appRow, 'Application must exist in database');
    assert.strictEqual(appRow.job_id, testJobId1, 'Application must link to target job');
    assert.strictEqual(appRow.resume_version_id, tailoredVersionId, 'Application must link to tailored resume version');
  });

  it('Requirement 3: Clicking on dashboard cards returns list based on card data', async () => {
    // 1. Test matched_jobs card
    let matchedJson: any = null;
    const mockRes1: any = {
      json(data: any) { matchedJson = data; return this; }
    };
    await getCardDetails({ userId: testUserId, query: { cardType: 'matched_jobs' } } as any, mockRes1);
    assert.ok(matchedJson, 'matched_jobs card query must return response');
    assert.strictEqual(matchedJson.cardType, 'matched_jobs');
    assert.ok(matchedJson.items.length >= 1, 'matched_jobs should return matched jobs list');
    const matchedReactJob = matchedJson.items.find((i: any) => i.id === testJobId1);
    assert.ok(matchedReactJob, 'React job should be in matched_jobs list');

    // 2. Test applications_prepared card
    let preparedJson: any = null;
    const mockRes2: any = {
      json(data: any) { preparedJson = data; return this; }
    };
    await getCardDetails({ userId: testUserId, query: { cardType: 'applications_prepared' } } as any, mockRes2);
    assert.ok(preparedJson, 'applications_prepared card query must return response');
    assert.ok(preparedJson.items.length >= 1, 'applications_prepared should list the applied job');
    assert.ok(preparedJson.items[0].resume_version_label.includes('Tailored:'), 'Application item should display tailored resume label');

    // 3. Test jobs_discovered card
    let discoveredJson: any = null;
    const mockRes3: any = {
      json(data: any) { discoveredJson = data; return this; }
    };
    await getCardDetails({ userId: testUserId, query: { cardType: 'jobs_discovered' } } as any, mockRes3);
    assert.ok(discoveredJson, 'jobs_discovered card query must return response');
    assert.ok(discoveredJson.items.length >= 2, 'jobs_discovered should list all active discovered jobs');

    // 4. Test search filter on card list
    let searchJson: any = null;
    const mockRes4: any = {
      json(data: any) { searchJson = data; return this; }
    };
    await getCardDetails({ userId: testUserId, query: { cardType: 'jobs_discovered', search: 'React' } } as any, mockRes4);
    assert.ok(searchJson, 'search query must return response');
    assert.ok(searchJson.items.every((i: any) => i.title.includes('React') || i.company_name.includes('React')), 'Search filter should only return matching jobs');
  });

  it('Requirement 4: Batch apply tailors resumes and applies to all selected jobs', async () => {
    const db = await getDatabase();

    // Create a new matched test job
    const batchJob = await jobRepo.create({
      title: 'Full Stack TypeScript Cloud Architect',
      company_name: 'CloudScale Technologies',
      job_description: 'Architecting distributed systems using Node.js, TypeScript, PostgreSQL, and AWS cloud infrastructure.',
      required_skills: JSON.stringify(['TypeScript', 'Node.js', 'PostgreSQL', 'AWS']),
      experience_level: 'Senior',
      source: 'DirectTest',
      apply_url: 'https://example.com/apply/cloudscale',
      location: 'Remote',
      external_id: `ext_batch_${Date.now()}`,
      status: 'active',
    } as any);

    let batchStatusCode = 200;
    let batchResponseBody: any = null;

    const mockRes: any = {
      status(code: number) {
        batchStatusCode = code;
        return this;
      },
      json(data: any) {
        batchResponseBody = data;
        return this;
      },
    };

    // Execute batch apply for the selected job
    await batchApplyToJobs(
      {
        userId: testUserId,
        body: {
          jobIds: [batchJob.id],
        },
      } as any,
      mockRes
    );

    assert.strictEqual(batchStatusCode, 200, 'Batch apply should return 200 OK');
    assert.ok(batchResponseBody, 'Batch apply response body should be returned');
    assert.strictEqual(batchResponseBody.appliedCount, 1, 'Should have applied to 1 job');
    assert.strictEqual(batchResponseBody.successful.length, 1, 'Should have 1 successful application');

    // Verify tailored resume was created for this batch applied job
    const tailoredVersion = await db.get<any>(
      `SELECT * FROM resume_versions WHERE target_job_id = ? AND user_id = ?`,
      [batchJob.id, testUserId]
    );
    assert.ok(tailoredVersion, 'Tailored resume must be stored for batch applied job');
    assert.ok(tailoredVersion.label.includes('Tailored: Full Stack TypeScript Cloud Architect'), 'Tailored label must match role');

    // Verify application record in database
    const application = await db.get<any>(
      `SELECT * FROM applications WHERE job_id = ? AND user_id = ?`,
      [batchJob.id, testUserId]
    );
    assert.ok(application, 'Application must be stored in database');
    assert.strictEqual(application.resume_version_id, tailoredVersion.id, 'Application must link to tailored resume');
  });
});
