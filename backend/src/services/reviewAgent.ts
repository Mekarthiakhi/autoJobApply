import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { ActivityLogRepository } from '../repositories/activityLogRepository.js';
import { 
  ApplicationStage, 
  ApplicationAnswer, 
  MissingFieldItem, 
  UncertainFieldItem, 
  SubmissionVerificationResult 
} from '../execution/types.js';
import { draftHashManager } from '../execution/draftHashManager.js';
import { controlledBrowserAgent } from '../execution/controlledBrowserAgent.js';

const activityLogRepository = new ActivityLogRepository();

export interface ReviewItem {
  application_id: string;
  job_id: string;
  job_title: string;
  company_name: string;
  job_location: string;
  job_salary: string;
  apply_url: string;
  match_score: number | null;
  resume_version_id: string | null;
  resume_label: string | null;
  resume_content?: string | null;
  cover_letter_id: string | null;
  cover_letter_content: string | null;
  warnings: string;
  scraped_questions: string;
  application_answers: string; // JSON of ApplicationAnswer[]
  missing_fields: string;      // JSON of MissingFieldItem[]
  uncertain_fields: string;    // JSON of UncertainFieldItem[]
  candidate_verified: number;
  draft_version: number;
  approved_draft_hash: string | null;
  approval_expires_at: string | null;
  stage_status: ApplicationStage;
  screenshot_path: string | null;
  review_status: string;
  created_at: string;
}

export class ReviewAgent {
  /**
   * Get all pending review items for a user
   */
  async getPendingReviews(userId: string): Promise<ReviewItem[]> {
    const db = await getDatabase();
    return (await db.all(
      `SELECT
        a.id as application_id,
        a.job_id,
        j.title as job_title,
        j.company_name,
        j.location as job_location,
        j.salary as job_salary,
        j.apply_url,
        a.match_score,
        a.resume_version_id,
        rv.label as resume_label,
        a.cover_letter_id,
        cl.content as cover_letter_content,
        a.warnings,
        a.scraped_questions,
        COALESCE(a.application_answers, '[]') as application_answers,
        COALESCE(a.missing_fields, '[]') as missing_fields,
        COALESCE(a.uncertain_fields, '[]') as uncertain_fields,
        COALESCE(a.candidate_verified, 0) as candidate_verified,
        COALESCE(a.draft_version, 1) as draft_version,
        a.approved_draft_hash,
        a.approval_expires_at,
        COALESCE(a.stage_status, 'READY_FOR_REVIEW') as stage_status,
        a.screenshot_path,
        a.review_status,
        a.applied_at as created_at
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       LEFT JOIN resume_versions rv ON a.resume_version_id = rv.id
       LEFT JOIN cover_letters cl ON a.cover_letter_id = cl.id
       WHERE a.user_id = ? AND a.review_status IN ('pending', 'ready_for_review')
       ORDER BY a.match_score DESC, a.applied_at DESC`,
      [userId]
    )) as ReviewItem[];
  }

  /**
   * Get a single review item with full details
   */
  async getReviewDetail(applicationId: string): Promise<ReviewItem | null> {
    const db = await getDatabase();
    const row = await db.get(
      `SELECT
        a.id as application_id,
        a.job_id,
        j.title as job_title,
        j.company_name,
        j.location as job_location,
        j.salary as job_salary,
        j.apply_url,
        j.job_description,
        a.match_score,
        a.resume_version_id,
        rv.label as resume_label,
        rv.text_content as resume_content,
        a.cover_letter_id,
        cl.content as cover_letter_content,
        a.warnings,
        a.scraped_questions,
        COALESCE(a.application_answers, '[]') as application_answers,
        COALESCE(a.missing_fields, '[]') as missing_fields,
        COALESCE(a.uncertain_fields, '[]') as uncertain_fields,
        COALESCE(a.candidate_verified, 0) as candidate_verified,
        COALESCE(a.draft_version, 1) as draft_version,
        a.approved_draft_hash,
        a.approval_expires_at,
        COALESCE(a.stage_status, 'READY_FOR_REVIEW') as stage_status,
        a.screenshot_path,
        a.review_status,
        a.user_id,
        a.applied_at as created_at
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       LEFT JOIN resume_versions rv ON a.resume_version_id = rv.id
       LEFT JOIN cover_letters cl ON a.cover_letter_id = cl.id
       WHERE a.id = ?`,
      [applicationId]
    );
    return (row || null) as any;
  }

  /**
   * Candidate verifies all application answers
   */
  async verifyAnswers(
    userId: string,
    applicationId: string,
    verifiedAnswers: ApplicationAnswer[]
  ): Promise<void> {
    const db = await getDatabase();
    const app = await db.get(`SELECT id, user_id, review_status, approved_draft_hash, stage_status FROM applications WHERE id = ?`, [applicationId]);
    if (!app || app.user_id !== userId) {
      throw new Error('Application not found or unauthorized');
    }

    const answersJson = JSON.stringify(verifiedAnswers);

    // If application was already approved, modifying answers must invalidate approval
    let newApprovedHash = app.approved_draft_hash;
    let newStageStatus = app.stage_status;
    let newReviewStatus = app.review_status;

    if (app.review_status === 'approved') {
      newApprovedHash = null;
      newStageStatus = ApplicationStage.READY_FOR_REVIEW;
      newReviewStatus = 'ready_for_review';

      await activityLogRepository.create(userId, 'application_approval_invalidated', {
        details: { applicationId, reason: 'Candidate updated application answers after approval.' },
      });
    }

    await db.run(
      `UPDATE applications 
       SET application_answers = ?, 
           candidate_verified = 1,
           approved_draft_hash = ?,
           stage_status = ?,
           review_status = ?,
           draft_version = draft_version + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [answersJson, newApprovedHash, newStageStatus, newReviewStatus, applicationId, userId]
    );

    await activityLogRepository.create(userId, 'application_answers_verified', {
      details: { applicationId, answersCount: verifiedAnswers.length },
    });
  }

  /**
   * Update application draft components (e.g. change resume version or cover letter)
   * Invalidates approval if previously granted.
   */
  async updateDraft(
    userId: string,
    applicationId: string,
    updates: {
      resumeVersionId?: string;
      coverLetterId?: string;
      notes?: string;
    }
  ): Promise<void> {
    const db = await getDatabase();
    const app = await db.get(`SELECT id, user_id, review_status FROM applications WHERE id = ?`, [applicationId]);
    if (!app || app.user_id !== userId) {
      throw new Error('Application not found or unauthorized');
    }

    const sets: string[] = ['draft_version = draft_version + 1', 'candidate_verified = 0'];
    const params: any[] = [];

    if (updates.resumeVersionId !== undefined) {
      sets.push('resume_version_id = ?');
      params.push(updates.resumeVersionId);
    }
    if (updates.coverLetterId !== undefined) {
      sets.push('cover_letter_id = ?');
      params.push(updates.coverLetterId);
    }
    if (updates.notes !== undefined) {
      sets.push('notes = ?');
      params.push(updates.notes);
    }

    // Invalidate approval if already approved
    if (app.review_status === 'approved') {
      sets.push(`review_status = 'ready_for_review'`);
      sets.push(`stage_status = '${ApplicationStage.READY_FOR_REVIEW}'`);
      sets.push('approved_draft_hash = NULL');
      sets.push('approval_expires_at = NULL');

      await activityLogRepository.create(userId, 'application_approval_invalidated', {
        details: { applicationId, reason: 'Draft components were modified after approval.' },
      });
    }

    sets.push('updated_at = CURRENT_TIMESTAMP');
    params.push(applicationId, userId);

    await db.run(
      `UPDATE applications SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );
  }

  /**
   * Approve an individual application.
   * Cryptographically binds approval to the exact application draft and sets a 24h expiration TTL.
   */
  async approve(
    userId: string, 
    applicationId: string, 
    options: { verifiedAnswers?: boolean; notes?: string } = {}
  ): Promise<{ draftHash: string; expiresAt: string }> {
    const db = await getDatabase();
    logger.info('Application approval requested', { agent: 'Review', userId, applicationId });

    // Verify ownership and fetch full application draft
    const app = await db.get(
      `SELECT a.id, a.user_id, a.job_id, a.review_status, a.status, a.resume_version_id, 
              a.cover_letter_id, a.application_answers, a.candidate_verified, a.stage_status
       FROM applications a 
       WHERE a.id = ? AND a.user_id = ?`,
      [applicationId, userId]
    ) as any;

    if (!app) {
      throw new Error('Application not found or unauthorized');
    }

    if (app.review_status !== 'pending' && app.review_status !== 'ready_for_review') {
      throw new Error(`Application cannot be approved: current review status is "${app.review_status}"`);
    }

    if (app.stage_status === ApplicationStage.SUBMITTED || app.status === 'applied') {
      throw new Error('Application cannot be approved: it has already been submitted.');
    }

    // Require verification of answers
    const isVerified = app.candidate_verified === 1 || options.verifiedAnswers === true;
    if (!isVerified) {
      throw new Error('Candidate must verify all application answers before granting approval.');
    }

    const answers: ApplicationAnswer[] = app.application_answers ? JSON.parse(app.application_answers) : [];

    // Compute cryptographic draft hash
    const draftHash = draftHashManager.computeDraftHash({
      jobId: app.job_id,
      resumeVersionId: app.resume_version_id,
      coverLetterId: app.cover_letter_id,
      answers,
    });

    const expiresAt = draftHashManager.generateApprovalExpiry(24);

    await db.run(
      `UPDATE applications SET 
        review_status = 'approved',
        stage_status = '${ApplicationStage.APPROVED}',
        status = 'applying',
        candidate_verified = 1,
        approved_draft_hash = ?,
        approval_expires_at = ?,
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND user_id = ?`,
      [draftHash, expiresAt, options.notes || null, applicationId, userId]
    );

    // Record approval audit log
    await activityLogRepository.create(userId, 'application_approved', {
      jobId: app.job_id,
      details: {
        applicationId,
        authorizedBy: userId,
        draftHash,
        expiresAt,
      },
    });

    return { draftHash, expiresAt };
  }

  /**
   * Bulk approval is disabled initially by system policy for candidate safety.
   */
  async approveAll(userId: string): Promise<number> {
    logger.warn('Bulk approval attempted but blocked by system policy', { agent: 'Review', userId });
    throw new Error('Bulk approval is disabled by system policy. Individual review and approval is required for candidate safety.');
  }

  /**
   * Strictly verify backend approval before final submission
   */
  async verifyApprovalBeforeSubmission(userId: string, applicationId: string): Promise<SubmissionVerificationResult> {
    const db = await getDatabase();
    const app = await db.get(
      `SELECT a.id, a.user_id, a.job_id, a.review_status, a.status, a.stage_status,
              a.resume_version_id, a.cover_letter_id, a.application_answers,
              a.approved_draft_hash, a.approval_expires_at, a.candidate_verified
       FROM applications a
       WHERE a.id = ?`,
      [applicationId]
    );

    if (!app || app.user_id !== userId) {
      return {
        isAuthorized: false,
        rejectionCode: 'UNAUTHORIZED',
        error: 'Application does not exist or user is unauthorized.',
        currentDraftHash: '',
      };
    }

    if (app.stage_status === ApplicationStage.SUBMITTED || app.status === 'applied') {
      return {
        isAuthorized: false,
        rejectionCode: 'ALREADY_SUBMITTED',
        error: 'Application has already been submitted. Duplicate submissions are strictly prevented.',
        currentDraftHash: app.approved_draft_hash || '',
      };
    }

    const answers: ApplicationAnswer[] = app.application_answers ? JSON.parse(app.application_answers) : [];
    const currentDraftHash = draftHashManager.computeDraftHash({
      jobId: app.job_id,
      resumeVersionId: app.resume_version_id,
      coverLetterId: app.cover_letter_id,
      answers,
    });

    if (app.review_status !== 'approved' || app.stage_status !== ApplicationStage.APPROVED) {
      return {
        isAuthorized: false,
        rejectionCode: 'NOT_APPROVED',
        error: 'Application has not received explicit candidate approval.',
        currentDraftHash,
      };
    }

    if (!app.candidate_verified) {
      return {
        isAuthorized: false,
        rejectionCode: 'UNVERIFIED_ANSWERS',
        error: 'Candidate has not verified all application answers.',
        currentDraftHash,
      };
    }

    const validation = draftHashManager.validateApproval(
      currentDraftHash,
      app.approved_draft_hash,
      app.approval_expires_at
    );

    if (!validation.isValid) {
      const isExpired = validation.reason?.includes('expired');
      return {
        isAuthorized: false,
        rejectionCode: isExpired ? 'APPROVAL_EXPIRED' : 'DRAFT_CHANGED',
        error: validation.reason,
        currentDraftHash,
        approvedDraftHash: app.approved_draft_hash,
        expiresAt: app.approval_expires_at,
      };
    }

    return {
      isAuthorized: true,
      currentDraftHash,
      approvedDraftHash: app.approved_draft_hash,
      expiresAt: app.approval_expires_at,
    };
  }

  /**
   * Reject an application
   */
  async reject(userId: string, applicationId: string, reason?: string): Promise<void> {
    const db = await getDatabase();
    logger.info('Application rejected', { agent: 'Review', userId, applicationId, reason });

    await db.run(
      `UPDATE applications SET 
        review_status = 'rejected', 
        stage_status = '${ApplicationStage.REJECTED}', 
        status = 'rejected', 
        approved_draft_hash = NULL,
        approval_expires_at = NULL,
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND user_id = ?`,
      [applicationId, userId]
    );

    const app = await db.get(`SELECT job_id FROM applications WHERE id = ?`, [applicationId]) as any;
    await activityLogRepository.create(userId, 'application_rejected', {
      jobId: app?.job_id,
      details: { applicationId, reason: reason || 'Candidate rejected draft' },
    });
  }

  /**
   * Queue a job for review
   */
  async queueForReview(
    userId: string,
    jobId: string,
    options: {
      matchScore?: number;
      resumeVersionId?: string;
      coverLetterId?: string;
      screenshotPath?: string;
      warnings?: string[];
      scrapedQuestions?: string[];
      applicationAnswers?: ApplicationAnswer[];
      missingFields?: MissingFieldItem[];
      uncertainFields?: UncertainFieldItem[];
      stageStatus?: ApplicationStage;
    } = {}
  ): Promise<string> {
    const db = await getDatabase();
    const stageStatus = options.stageStatus || ApplicationStage.READY_FOR_REVIEW;

    const existing = await db.get(
      `SELECT id FROM applications WHERE user_id = ? AND job_id = ?`,
      [userId, jobId]
    );

    if (existing) {
      await db.run(
        `UPDATE applications SET
          review_status = 'pending',
          stage_status = ?,
          match_score = COALESCE(?, match_score),
          resume_version_id = COALESCE(?, resume_version_id),
          cover_letter_id = COALESCE(?, cover_letter_id),
          screenshot_path = COALESCE(?, screenshot_path),
          warnings = COALESCE(?, warnings),
          scraped_questions = COALESCE(?, scraped_questions),
          application_answers = COALESCE(?, application_answers),
          missing_fields = COALESCE(?, missing_fields),
          uncertain_fields = COALESCE(?, uncertain_fields),
          approved_draft_hash = NULL,
          approval_expires_at = NULL,
          candidate_verified = 0,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          stageStatus,
          options.matchScore ?? null,
          options.resumeVersionId ?? null,
          options.coverLetterId ?? null,
          options.screenshotPath ?? null,
          options.warnings ? JSON.stringify(options.warnings) : null,
          options.scrapedQuestions ? JSON.stringify(options.scrapedQuestions) : null,
          options.applicationAnswers ? JSON.stringify(options.applicationAnswers) : null,
          options.missingFields ? JSON.stringify(options.missingFields) : null,
          options.uncertainFields ? JSON.stringify(options.uncertainFields) : null,
          (existing as any).id,
        ]
      );

      await activityLogRepository.create(userId, 'queue_review', { jobId, details: { updated: true, applicationId: (existing as any).id } });
      return (existing as any).id;
    }

    await db.run(
      `INSERT INTO applications (
        user_id, job_id, status, review_status, stage_status, match_score, 
        resume_version_id, cover_letter_id, screenshot_path, warnings, scraped_questions,
        application_answers, missing_fields, uncertain_fields
      ) VALUES (?, ?, 'pending', 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        jobId,
        stageStatus,
        options.matchScore ?? null,
        options.resumeVersionId ?? null,
        options.coverLetterId ?? null,
        options.screenshotPath ?? null,
        JSON.stringify(options.warnings || []),
        JSON.stringify(options.scrapedQuestions || []),
        JSON.stringify(options.applicationAnswers || []),
        JSON.stringify(options.missingFields || []),
        JSON.stringify(options.uncertainFields || []),
      ]
    );

    const row = await db.get(
      `SELECT id FROM applications WHERE user_id = ? AND job_id = ? ORDER BY applied_at DESC LIMIT 1`,
      [userId, jobId]
    ) as any;

    await activityLogRepository.create(userId, 'queue_review', { jobId, details: { applicationId: row.id } });
    return row.id;
  }
}

export const reviewAgent = new ReviewAgent();
