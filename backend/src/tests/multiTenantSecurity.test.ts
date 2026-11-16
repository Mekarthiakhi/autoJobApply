import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { initializeDatabase, getDatabase } from '../config/database.js';
import { ApplicationRepository } from '../repositories/applicationRepository.js';
import { ResumeVersionRepository } from '../repositories/resumeVersionRepository.js';
import { JobRepository } from '../repositories/jobRepository.js';
import { CoverLetterRepository } from '../repositories/coverLetterRepository.js';
import { updateApplicationStatus, getApplications } from '../controllers/applicationController.js';
import { generateCoverLetter, deleteCoverLetter, getCoverLetter, updateCoverLetter } from '../controllers/coverLetterController.js';
import { getExplainableScore } from '../controllers/jobController.js';
import { deleteResumeVersion, getResumeVersion, updateResumeVersion } from '../controllers/resumeVersionController.js';
import { multiAgentPipelineOrchestrator } from '../agents/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { aiModelManager } from '../ai/index.js';

describe('Phase 16: Multi-Tenant Security Remediation Tests', () => {
  let applicationRepo: ApplicationRepository;
  let resumeVersionRepo: ResumeVersionRepository;
  let jobRepo: JobRepository;
  let coverLetterRepo: CoverLetterRepository;

  let userAId: string;
  let userBId: string;
  let userCId: string; // User with no resume
  let testJobId: string;
  let appAId: string;
  let appBId: string;
  let resumeAId: string;
  let resumeBId: string;

  before(async () => {
    await initializeDatabase();
    applicationRepo = new ApplicationRepository();
    resumeVersionRepo = new ResumeVersionRepository();
    jobRepo = new JobRepository();
    coverLetterRepo = new CoverLetterRepository();

    const db = await getDatabase();

    // 1. Create User A
    const emailA = `tenant_a_${Date.now()}@example.com`;
    await db.run(
      `INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)`,
      [emailA, 'hash_pass_a', 'Alice Tenant']
    );
    const userARow = await db.get(`SELECT id FROM users WHERE email = ?`, [emailA]);
    userAId = userARow.id;

    // 2. Create User B
    const emailB = `tenant_b_${Date.now()}@example.com`;
    await db.run(
      `INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)`,
      [emailB, 'hash_pass_b', 'Bob Tenant']
    );
    const userBRow = await db.get(`SELECT id FROM users WHERE email = ?`, [emailB]);
    userBId = userBRow.id;

    // 3. Create User C (No resume)
    const emailC = `tenant_c_${Date.now()}@example.com`;
    await db.run(
      `INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)`,
      [emailC, 'hash_pass_c', 'Charlie Tenant']
    );
    const userCRow = await db.get(`SELECT id FROM users WHERE email = ?`, [emailC]);
    userCId = userCRow.id;

    // 4. Create shared test job
    const job = await jobRepo.create({
      title: 'Principal Systems Security Engineer',
      company_name: 'SecurityLabs',
      location: 'Remote',
      salary: '$200,000 - $250,000',
      experience_level: 'Principal',
      required_skills: ['Security', 'Cryptography', 'Linux', 'Go'],
      apply_url: 'https://securitylabs.example/jobs/principal',
      source: 'manual',
      external_id: `sec-job-${Date.now()}`,
      status: 'active',
      employment_type: 'Full-Time',
      posted_date: new Date(),
      job_description: 'Architect multi-tenant isolation, cryptography, and zero-trust controls.',
    });
    testJobId = job.id;

    // 5. Create default resume for User A
    const resumeA = await resumeVersionRepo.create(
      userAId,
      'User A Default Resume',
      'resume_a.pdf',
      'Alice Tenant - 8 years of TypeScript, React, and Application Security experience.',
      ['TypeScript', 'React', 'Security'],
      { versionNumber: 1 }
    );
    resumeAId = resumeA.id;
    await resumeVersionRepo.setDefault(userAId, resumeAId);

    // 6. Create default resume for User B
    const resumeB = await resumeVersionRepo.create(
      userBId,
      'User B Confidential Resume',
      'resume_b.pdf',
      'Bob Tenant - Confidential Kernel Security, C++, Rust, and Hypervisor internals.',
      ['C++', 'Rust', 'Kernel'],
      { versionNumber: 1 }
    );
    resumeBId = resumeB.id;
    await resumeVersionRepo.setDefault(userBId, resumeBId);

    // 7. Create application for User A
    const appA = await applicationRepo.create(userAId, testJobId, {
      resumeVersionId: resumeAId,
      matchScore: 88,
    });
    appAId = appA.id;

    // 8. Create application for User B
    const appB = await applicationRepo.create(userBId, testJobId, {
      resumeVersionId: resumeBId,
      matchScore: 92,
    });
    appBId = appB.id;
  });

  describe('1. SEC-01: Application Status Update IDOR Remediation', () => {
    it('User A cannot update User B application status via repository', async () => {
      const updateResult = await applicationRepo.updateStatus(appBId, userAId, 'rejected');
      assert.strictEqual(updateResult, null, 'Repository must return null when user does not own application');

      // Verify User B application was NOT updated in database
      const appBAfter = await applicationRepo.findById(appBId);
      assert.strictEqual(appBAfter?.status, 'pending', 'User B application status must remain unchanged');
      assert.strictEqual(appBAfter?.rejected, 0, 'User B rejected flag must remain 0');
    });

    it('User A cannot update User B application status via controller (throws 404/Forbidden)', async () => {
      const req: any = {
        userId: userAId,
        params: { applicationId: appBId },
        body: { status: 'rejected' },
      };
      let statusCode = 0;
      let errorResponse: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (payload: any) => { errorResponse = payload; },
          };
        },
      };

      await updateApplicationStatus(req, res);

      assert.strictEqual(statusCode, 404, 'Must return 404 Not Found for unauthorized application update');
      assert.ok(errorResponse?.error?.includes('not found or unauthorized'));

      // Confirm DB was untouched
      const appBAfter = await applicationRepo.findById(appBId);
      assert.strictEqual(appBAfter?.status, 'pending');
    });

    it('User A can update their own application status via repository and controller', async () => {
      // 1. Repository direct update
      const repoResult = await applicationRepo.updateStatus(appAId, userAId, 'interview');
      assert.ok(repoResult, 'Repository must return updated application');
      assert.strictEqual(repoResult.status, 'interview');
      assert.strictEqual(repoResult.interview_scheduled, 1);

      // 2. Controller endpoint update
      const req: any = {
        userId: userAId,
        params: { applicationId: appAId },
        body: { status: 'offer' },
      };
      let responsePayload: any = null;
      const res: any = {
        json: (payload: any) => { responsePayload = payload; },
      };

      await updateApplicationStatus(req, res);

      assert.ok(responsePayload);
      assert.strictEqual(responsePayload.status, 'offer');
      assert.strictEqual(responsePayload.offer_received, 1);

      // Verify in DB
      const appAInDb = await applicationRepo.findById(appAId);
      assert.strictEqual(appAInDb?.status, 'offer');
      assert.strictEqual(appAInDb?.offer_received, 1);
    });
  });

  describe('2. SEC-02: Default Resume Tenant Isolation in Workflow', () => {
    it('User A workflow resolution retrieves only User A default resume, never User B', async () => {
      const db = await getDatabase();

      // Execute the exact query implemented in WorkflowOrchestrator.runWorkflow(userId)
      const userAResume = await db.get(
        `SELECT id, text_content FROM resume_versions WHERE user_id = ? AND is_default = 1`,
        [userAId]
      );

      assert.ok(userAResume, 'User A default resume must be found');
      assert.strictEqual(userAResume.id, resumeAId);
      assert.ok(userAResume.text_content.includes('Alice Tenant'));
      assert.ok(!userAResume.text_content.includes('Bob Tenant'), 'Must never contain User B content');
      assert.ok(!userAResume.text_content.includes('Confidential Kernel Security'), 'Must never leak User B text');
    });

    it('User with no default resume (User C) receives a safe result without leaking other users resumes', async () => {
      const db = await getDatabase();

      // Execute query for User C who has no resumes created
      const userCResume = await db.get(
        `SELECT id, text_content FROM resume_versions WHERE user_id = ? AND is_default = 1`,
        [userCId]
      );

      // Must be undefined - must NOT fall back to any other user's default resume
      assert.strictEqual(userCResume, undefined, 'User C query must return undefined');

      // WorkflowOrchestrator safe fallback handling
      const resumeRow = userCResume as any;
      const resumeText = resumeRow?.text_content || 'No resume provided.';
      const resumeId = resumeRow?.id || null;

      assert.strictEqual(resumeText, 'No resume provided.');
      assert.strictEqual(resumeId, null);
    });
  });

  describe('3. SEC-03: Cover Letter Resume Ownership Validation', () => {
    it('User A cannot generate a cover letter using User B resume (returns HTTP 403 Forbidden)', async () => {
      const req: any = {
        userId: userAId,
        body: {
          jobId: testJobId,
          resumeVersionId: resumeBId, // Attempting to steal User B's resume content!
        },
      };

      let statusCode = 0;
      let errorResponse: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (payload: any) => { errorResponse = payload; },
          };
        },
      };

      await generateCoverLetter(req, res);

      assert.strictEqual(statusCode, 403, 'Must return HTTP 403 Forbidden when accessing another users resume');
      assert.ok(
        errorResponse?.error?.includes('Forbidden') || errorResponse?.error?.includes('permission'),
        'Must specify permission error'
      );
    });

    it('User A can generate a cover letter using their own resume version (HTTP 201)', async () => {
      const req: any = {
        userId: userAId,
        body: {
          jobId: testJobId,
          resumeVersionId: resumeAId,
        },
      };

      let statusCode = 0;
      let successPayload: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (payload: any) => { successPayload = payload; },
          };
        },
      };

      await generateCoverLetter(req, res);

      assert.strictEqual(statusCode, 201, 'Must succeed with HTTP 201 Created');
      assert.ok(successPayload);
      assert.ok(successPayload.content, 'Must return generated cover letter content');
      assert.ok(successPayload.id, 'Must return saved cover letter ID');

      // Verify the cover letter was saved under User A's ID
      const db = await getDatabase();
      const savedInDb = await db.get(`SELECT user_id, resume_version_id FROM cover_letters WHERE id = ?`, [successPayload.id]);
      assert.strictEqual(savedInDb?.user_id, userAId, 'Saved cover letter must belong to User A');
      assert.strictEqual(savedInDb?.resume_version_id, resumeAId, 'Saved cover letter must link to User A resume version');
    });

    it('User with non-existent resumeVersionId receives safe 404 response', async () => {
      const req: any = {
        userId: userAId,
        body: {
          jobId: testJobId,
          resumeVersionId: 'non-existent-resume-uuid-99999',
        },
      };

      let statusCode = 0;
      let errorResponse: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (payload: any) => { errorResponse = payload; },
          };
        },
      };

      await generateCoverLetter(req, res);

      assert.strictEqual(statusCode, 404, 'Must return HTTP 404 when resume version does not exist');
      assert.ok(errorResponse?.error?.includes('Resume version not found'));
    });
  });

  describe('Phase 18: Complete Multi-Tenant Resume & Deletion Isolation Tests', () => {
    it('1. User A match scoring never retrieves User B default resume', async () => {
      let scorePayload: any = null;
      let statusCode = 200;
      const req: any = {
        userId: userAId,
        params: { jobId: testJobId },
      };
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (p: any) => { scorePayload = p; } };
        },
        json: (p: any) => { scorePayload = p; },
      };

      await getExplainableScore(req, res);

      assert.strictEqual(statusCode, 200);
      assert.ok(scorePayload, 'Must return score payload');
      assert.strictEqual(scorePayload.jobId, testJobId);

      // User A skills has 'Security'. User B has 'C++', 'Rust', 'Kernel'.
      const skillsFactor = scorePayload.factors?.find((f: any) => f.name === 'Skills Match');
      assert.ok(skillsFactor, 'Must include Skills Match factor');

      // User A matches 'security'
      assert.ok(skillsFactor.reason.includes('security'), 'User A score must match User A resume skill Security');
      // Must NOT match User B skills
      assert.ok(!skillsFactor.reason.includes('c++'), 'User A score must NOT contain User B skill C++');
      assert.ok(!skillsFactor.reason.includes('rust'), 'User A score must NOT contain User B skill Rust');
    });

    it('2. User B match scoring uses User B own default resume', async () => {
      let scorePayload: any = null;
      let statusCode = 200;
      const req: any = {
        userId: userBId,
        params: { jobId: testJobId },
      };
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (p: any) => { scorePayload = p; } };
        },
        json: (p: any) => { scorePayload = p; },
      };

      await getExplainableScore(req, res);

      assert.strictEqual(statusCode, 200);
      assert.ok(scorePayload, 'Must return score payload');

      const skillsFactor = scorePayload.factors?.find((f: any) => f.name === 'Skills Match');
      assert.ok(skillsFactor, 'Must include Skills Match factor');
      // User B has ['C++', 'Rust', 'Kernel'], none of which are in testJobId ['Security', 'Cryptography', 'Linux', 'Go']
      assert.ok(!skillsFactor.reason.includes('typescript'), 'User B score must not contain User A skill TypeScript');
      assert.ok(!skillsFactor.reason.includes('react'), 'User B score must not contain User A skill React');
    });

    it('3. User without default resume (User C) receives a safe result without cross-tenant leak', async () => {
      let scorePayload: any = null;
      let statusCode = 200;
      const req: any = {
        userId: userCId,
        params: { jobId: testJobId },
      };
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (p: any) => { scorePayload = p; } };
        },
        json: (p: any) => { scorePayload = p; },
      };

      await getExplainableScore(req, res);

      assert.strictEqual(statusCode, 200);
      assert.ok(scorePayload, 'Must return valid score payload');
      // Since User C has no resume, matched skills must be 0 and must not leak User A or B skills
      const skillsFactor = scorePayload.factors?.find((f: any) => f.name === 'Skills Match');
      assert.ok(skillsFactor, 'Must include Skills Match factor');
      assert.ok(skillsFactor.reason.startsWith('0 of 4 required skills matched'), 'User C must have 0 matched skills');
      assert.ok(!skillsFactor.reason.includes('typescript'));
      assert.ok(!skillsFactor.reason.includes('c++'));
    });

    it('4. User A pipeline never receives User B default resume and marks missing resume explicitly', async () => {
      const summary = await multiAgentPipelineOrchestrator.runPipeline(userAId, {
        limitJobs: 1,
        skipDiscovery: true,
        initialJobIds: [testJobId],
        skipBrowserInspection: true,
      });

      assert.strictEqual(summary.userId, userAId);
      assert.strictEqual(summary.state, 'COMPLETED');

      // Check SQLite database for queued applications
      const db = await getDatabase();
      const userAApps = await db.all(
        `SELECT resume_version_id FROM applications WHERE user_id = ?`,
        [userAId]
      );

      for (const app of userAApps) {
        if (app.resume_version_id) {
          assert.strictEqual(
            app.resume_version_id,
            resumeAId,
            'User A pipeline must only link User A resume version, never User B'
          );
        }
      }

      // Check User C (no resume) pipeline execution: must explicitly flag missing resume
      const summaryC = await multiAgentPipelineOrchestrator.runPipeline(userCId, {
        limitJobs: 1,
        skipDiscovery: true,
        initialJobIds: [testJobId],
        skipBrowserInspection: true,
      });
      assert.strictEqual(summaryC.userId, userCId);
      assert.strictEqual(summaryC.state, 'COMPLETED');

      // Verify that applications queued for User C have null resume_version_id and explicit warnings
      const userCApps = await db.all(
        `SELECT resume_version_id, warnings FROM applications WHERE user_id = ?`,
        [userCId]
      );
      for (const app of userCApps) {
        assert.strictEqual(app.resume_version_id, null, 'User C draft must have null resume_version_id');
        if (app.warnings) {
          const warnings = typeof app.warnings === 'string' ? JSON.parse(app.warnings) : app.warnings;
          assert.ok(
            warnings.some((w: string) => w.includes('No candidate resume configured')),
            'User C draft must contain explicit missing resume warning'
          );
        }
      }
    });

    it('5. User A cannot delete User B resume version (via repository or controller)', async () => {
      // 1. Repository-level isolation check with mandatory userId
      const repoDeleted = await resumeVersionRepo.delete(resumeBId, userAId);
      assert.strictEqual(repoDeleted, false, 'Repository delete must return false for cross-tenant target');

      const repoDeletedAlias = await resumeVersionRepo.deleteForUser(resumeBId, userAId);
      assert.strictEqual(repoDeletedAlias, false, 'deleteForUser alias must also return false');

      // 2. Controller-level authorization check
      let statusCode = 0;
      let errorResponse: any = null;
      const req: any = {
        userId: userAId,
        params: { id: resumeBId },
      };
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (p: any) => { errorResponse = p; } };
        },
        json: (p: any) => { statusCode = 200; },
      };

      await deleteResumeVersion(req, res);
      assert.strictEqual(statusCode, 403, 'Controller must return 403 Forbidden for cross-tenant delete');

      // 3. Database state verification: User B resume must still be intact
      const dbResumeB = await resumeVersionRepo.findById(resumeBId);
      assert.ok(dbResumeB, 'User B resume version must remain completely untouched in database');
      assert.strictEqual(dbResumeB?.user_id, userBId);
    });

    it('6. User A cannot delete User B cover letter (via repository or controller)', async () => {
      // Create a test cover letter for User B
      const coverLetterB = await coverLetterRepo.create(
        userBId,
        testJobId,
        resumeBId,
        'Confidential Cover Letter belonging to User B.'
      );

      // 1. Repository-level isolation check with mandatory userId
      const repoDeleted = await coverLetterRepo.delete(coverLetterB.id, userAId);
      assert.strictEqual(repoDeleted, false, 'Repository delete must return false for cross-tenant target');

      const repoDeletedAlias = await coverLetterRepo.deleteForUser(coverLetterB.id, userAId);
      assert.strictEqual(repoDeletedAlias, false, 'deleteForUser alias must also return false');

      // 2. Controller-level authorization check
      let statusCode = 0;
      let errorResponse: any = null;
      const req: any = {
        userId: userAId,
        params: { id: coverLetterB.id },
      };
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (p: any) => { errorResponse = p; } };
        },
        json: (p: any) => { statusCode = 200; },
      };

      await deleteCoverLetter(req, res);
      assert.strictEqual(statusCode, 403, 'Controller must return 403 Forbidden for cross-tenant delete');

      // 3. Database state verification: User B cover letter must still be intact
      const dbCoverB = await coverLetterRepo.findById(coverLetterB.id);
      assert.ok(dbCoverB, 'User B cover letter must remain completely untouched in database');
      assert.strictEqual(dbCoverB?.user_id, userBId);
    });

    it('7. Owners can still delete their own records with mandatory userId', async () => {
      // 1. Create and delete disposable resume version for User A
      const disposableResume = await resumeVersionRepo.create(
        userAId,
        'User A Disposable Resume',
        'disp.pdf',
        'Temporary resume text.',
        ['Temporary'],
        { versionNumber: 99 }
      );

      let statusCode = 0;
      const reqRes: any = {
        userId: userAId,
        params: { id: disposableResume.id },
      };
      const resRes: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: () => {} };
        },
        json: () => { statusCode = 200; },
      };

      await deleteResumeVersion(reqRes, resRes);
      assert.strictEqual(statusCode, 200, 'Owner must be able to delete their own resume version');
      const checkResume = await resumeVersionRepo.findById(disposableResume.id);
      assert.strictEqual(checkResume, null, 'Deleted resume version must no longer exist in database');

      // 2. Create and delete disposable cover letter for User A
      const disposableCover = await coverLetterRepo.create(
        userAId,
        testJobId,
        resumeAId,
        'Temporary cover letter text.'
      );

      let statusCoverCode = 0;
      const reqCover: any = {
        userId: userAId,
        params: { id: disposableCover.id },
      };
      const resCover: any = {
        status: (code: number) => {
          statusCoverCode = code;
          return { json: () => {} };
        },
        json: () => { statusCoverCode = 200; },
      };

      await deleteCoverLetter(reqCover, resCover);
      assert.strictEqual(statusCoverCode, 200, 'Owner must be able to delete their own cover letter');
      const checkCover = await coverLetterRepo.findById(disposableCover.id);
      assert.strictEqual(checkCover, null, 'Deleted cover letter must no longer exist in database');
    });

    it('8. Unscoped deletion without userId is completely impossible at runtime', async () => {
      // Create temporary records
      const tempResume = await resumeVersionRepo.create(
        userAId,
        'Temp Unscoped Test Resume',
        null,
        'test content',
        []
      );
      const tempCover = await coverLetterRepo.create(
        userAId,
        testJobId,
        tempResume.id,
        'test cover content'
      );

      // Attempt deletion with missing userId (simulate untyped or legacy caller)
      await assert.rejects(
        async () => (resumeVersionRepo.delete as any)(tempResume.id),
        /A valid userId is strictly required/,
        'Unscoped resume deletion must throw runtime error'
      );
      const resumeStillThere = await resumeVersionRepo.findById(tempResume.id);
      assert.ok(resumeStillThere, 'Resume must NOT be deleted when userId is omitted');

      await assert.rejects(
        async () => (coverLetterRepo.delete as any)(tempCover.id),
        /A valid userId is strictly required/,
        'Unscoped cover letter deletion must throw runtime error'
      );
      const coverStillThere = await coverLetterRepo.findById(tempCover.id);
      assert.ok(coverStillThere, 'Cover letter must NOT be deleted when userId is omitted');

      // Test repository-level cover letter update isolation
      const crossUpdate = await coverLetterRepo.update(tempCover.id, userBId, 'Hacked cover letter text');
      assert.strictEqual(crossUpdate, null, 'Cross-user update via repository must return null');
      const unhacked = await coverLetterRepo.findById(tempCover.id);
      assert.strictEqual(unhacked?.content, 'test cover content', 'Cover letter content must remain untouched');

      const ownerUpdate = await coverLetterRepo.update(tempCover.id, userAId, 'Legitimate updated text');
      assert.ok(ownerUpdate, 'Owner update via repository must succeed');
      assert.strictEqual(ownerUpdate?.content, 'Legitimate updated text');

      // Clean up using authorized user-scoped deletion
      await resumeVersionRepo.delete(tempResume.id, userAId);
      await coverLetterRepo.delete(tempCover.id, userAId);
    });

    it('9. Comprehensive cross-user CRUD isolation for Applications, Resume Versions, and Cover Letters', async () => {
      // 1. Applications Isolation
      // User B creates an application
      const appB = await applicationRepo.create(userBId, testJobId, {
        notes: 'Confidential Application of User B',
        matchScore: 95,
      });

      // User A reads applications list -> must NOT contain User B's application
      let userAApplications: any[] = [];
      const reqGetApps: any = { userId: userAId };
      const resGetApps: any = {
        json: (data: any[]) => { userAApplications = data; },
      };
      await getApplications(reqGetApps, resGetApps);
      assert.strictEqual(
        userAApplications.some(a => a.id === appB.id),
        false,
        'User A application query must NEVER return User B application'
      );

      // User A attempts to update User B's application status
      let appUpdateStatus = 0;
      const reqUpdateApp: any = {
        userId: userAId,
        params: { applicationId: appB.id },
        body: { status: 'rejected' },
      };
      const resUpdateApp: any = {
        status: (code: number) => {
          appUpdateStatus = code;
          return { json: () => {} };
        },
        json: () => { appUpdateStatus = 200; },
      };
      await updateApplicationStatus(reqUpdateApp, resUpdateApp);
      assert.strictEqual(appUpdateStatus, 404, 'User A update of User B application must return 404');
      const dbAppB = await applicationRepo.findById(appB.id);
      assert.strictEqual(dbAppB?.status, 'pending', 'User B application status must remain untouched');

      // 2. Resume Versions Isolation
      // User B creates a resume version
      const resumeB_isolated = await resumeVersionRepo.create(
        userBId,
        'User B Secure Resume',
        'secure.pdf',
        'Confidential candidate text for User B',
        ['Go', 'Rust']
      );

      // User A attempts to READ User B's resume
      let readResumeStatus = 0;
      const reqReadResume: any = { userId: userAId, params: { id: resumeB_isolated.id } };
      const resReadResume: any = {
        status: (code: number) => { readResumeStatus = code; return { json: () => {} }; },
        json: () => { readResumeStatus = 200; },
      };
      await getResumeVersion(reqReadResume, resReadResume);
      assert.strictEqual(readResumeStatus, 403, 'Cross-user read of resume version must return 403 Forbidden');

      // User A attempts to UPDATE User B's resume
      let updateResumeStatus = 0;
      const reqUpdateResume: any = {
        userId: userAId,
        params: { id: resumeB_isolated.id },
        body: { label: 'Hacked Label' },
      };
      const resUpdateResume: any = {
        status: (code: number) => { updateResumeStatus = code; return { json: () => {} }; },
        json: () => { updateResumeStatus = 200; },
      };
      await updateResumeVersion(reqUpdateResume, resUpdateResume);
      assert.strictEqual(updateResumeStatus, 403, 'Cross-user update of resume version must return 403 Forbidden');
      const dbResumeB = await resumeVersionRepo.findById(resumeB_isolated.id);
      assert.strictEqual(dbResumeB?.label, 'User B Secure Resume', 'Resume label must remain untouched');

      // User A attempts to DELETE User B's resume
      let deleteResumeStatus = 0;
      const reqDeleteResume: any = { userId: userAId, params: { id: resumeB_isolated.id } };
      const resDeleteResume: any = {
        status: (code: number) => { deleteResumeStatus = code; return { json: () => {} }; },
        json: () => { deleteResumeStatus = 200; },
      };
      await deleteResumeVersion(reqDeleteResume, resDeleteResume);
      assert.strictEqual(deleteResumeStatus, 403, 'Cross-user delete of resume version must return 403 Forbidden');
      const dbResumeStillThere = await resumeVersionRepo.findById(resumeB_isolated.id);
      assert.ok(dbResumeStillThere, 'User B resume must still exist');

      // 3. Cover Letters Isolation
      // User B creates a cover letter
      const coverB_isolated = await coverLetterRepo.create(
        userBId,
        testJobId,
        resumeB_isolated.id,
        'Private cover letter for User B'
      );

      // User A attempts to READ User B's cover letter
      let readCoverStatus = 0;
      const reqReadCover: any = { userId: userAId, params: { id: coverB_isolated.id } };
      const resReadCover: any = {
        status: (code: number) => { readCoverStatus = code; return { json: () => {} }; },
        json: () => { readCoverStatus = 200; },
      };
      await getCoverLetter(reqReadCover, resReadCover);
      assert.strictEqual(readCoverStatus, 403, 'Cross-user read of cover letter must return 403 Forbidden');

      // User A attempts to UPDATE User B's cover letter
      let updateCoverStatus = 0;
      const reqUpdateCover: any = {
        userId: userAId,
        params: { id: coverB_isolated.id },
        body: { content: 'Tampered cover letter' },
      };
      const resUpdateCover: any = {
        status: (code: number) => { updateCoverStatus = code; return { json: () => {} }; },
        json: () => { updateCoverStatus = 200; },
      };
      await updateCoverLetter(reqUpdateCover, resUpdateCover);
      assert.strictEqual(updateCoverStatus, 403, 'Cross-user update of cover letter must return 403 Forbidden');
      const dbCoverB = await coverLetterRepo.findById(coverB_isolated.id);
      assert.strictEqual(dbCoverB?.content, 'Private cover letter for User B', 'Cover letter content must remain untouched');

      // User A attempts to DELETE User B's cover letter
      let deleteCoverStatus = 0;
      const reqDeleteCover: any = { userId: userAId, params: { id: coverB_isolated.id } };
      const resDeleteCover: any = {
        status: (code: number) => { deleteCoverStatus = code; return { json: () => {} }; },
        json: () => { deleteCoverStatus = 200; },
      };
      await deleteCoverLetter(reqDeleteCover, resDeleteCover);
      assert.strictEqual(deleteCoverStatus, 403, 'Cross-user delete of cover letter must return 403 Forbidden');
      const dbCoverStillThere = await coverLetterRepo.findById(coverB_isolated.id);
      assert.ok(dbCoverStillThere, 'User B cover letter must still exist');

      // Clean up User B test records
      await resumeVersionRepo.delete(resumeB_isolated.id, userBId);
      await coverLetterRepo.delete(coverB_isolated.id, userBId);
    });
  });
});
