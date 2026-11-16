import { getDatabase } from '../config/database.js';
import { ApplicationStage, ApplicationAnswer, MissingFieldItem, UncertainFieldItem } from '../execution/types.js';

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: string;
  applied_at: string;
  interview_scheduled: boolean;
  interview_date: string | null;
  rejected: boolean;
  offer_received: boolean;
  notes: string;
  updated_at: string;
  // Joined or tracked fields
  resume_version_id?: string | null;
  resume_version_label?: string | null;
  cover_letter_id?: string | null;
  match_score?: number | null;
  review_status?: string | null;
  stage_status?: ApplicationStage;
  job_title?: string;
  company_name?: string;
  apply_url?: string;
  location?: string;
  application_answers?: string;
  missing_fields?: string;
  uncertain_fields?: string;
  candidate_verified?: number;
  draft_version?: number;
  approved_draft_hash?: string | null;
  approval_expires_at?: string | null;
  submission_attempt_count?: number;
  last_submission_error?: string | null;
}

export interface CreateApplicationOptions {
  resumeVersionId?: string | null;
  coverLetterId?: string | null;
  notes?: string;
  matchScore?: number;
  reviewStatus?: string;
  stageStatus?: ApplicationStage;
  applicationAnswers?: ApplicationAnswer[];
  missingFields?: MissingFieldItem[];
  uncertainFields?: UncertainFieldItem[];
}

export class ApplicationRepository {
  async create(
    userId: string, 
    jobId: string, 
    options: CreateApplicationOptions = {}
  ): Promise<Application> {
    const db = await getDatabase();
    
    await db.run(
      `INSERT INTO applications (
        user_id, job_id, resume_version_id, cover_letter_id, notes, match_score, 
        review_status, stage_status, application_answers, missing_fields, uncertain_fields
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id, job_id) DO UPDATE SET 
        resume_version_id = COALESCE(excluded.resume_version_id, applications.resume_version_id),
        cover_letter_id = COALESCE(excluded.cover_letter_id, applications.cover_letter_id),
        notes = COALESCE(excluded.notes, applications.notes),
        match_score = COALESCE(excluded.match_score, applications.match_score),
        review_status = COALESCE(excluded.review_status, applications.review_status),
        stage_status = COALESCE(excluded.stage_status, applications.stage_status),
        application_answers = COALESCE(excluded.application_answers, applications.application_answers),
        missing_fields = COALESCE(excluded.missing_fields, applications.missing_fields),
        uncertain_fields = COALESCE(excluded.uncertain_fields, applications.uncertain_fields),
        updated_at = CURRENT_TIMESTAMP`,
      [
        userId, 
        jobId, 
        options.resumeVersionId || null, 
        options.coverLetterId || null, 
        options.notes || '', 
        options.matchScore !== undefined ? options.matchScore : null,
        options.reviewStatus || 'pending',
        options.stageStatus || ApplicationStage.READY_FOR_REVIEW,
        options.applicationAnswers ? JSON.stringify(options.applicationAnswers) : '[]',
        options.missingFields ? JSON.stringify(options.missingFields) : '[]',
        options.uncertainFields ? JSON.stringify(options.uncertainFields) : '[]',
      ]
    );
    
    return this.findByUserAndJob(userId, jobId) as Promise<Application>;
  }

  async findById(id: string): Promise<Application | null> {
    const db = await getDatabase();
    const row = await db.get(
      `SELECT 
         a.*,
         j.title as job_title,
         j.company_name,
         j.location,
         j.apply_url,
         rv.label as resume_version_label
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       LEFT JOIN resume_versions rv ON a.resume_version_id = rv.id
       WHERE a.id = ?`,
      [id]
    );
    return (row || null) as Application | null;
  }

  async findByUserAndJob(userId: string, jobId: string): Promise<Application | null> {
    const db = await getDatabase();
    const row = await db.get(
      `SELECT 
         a.*,
         j.title as job_title,
         j.company_name,
         j.location,
         j.apply_url,
         rv.label as resume_version_label
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       LEFT JOIN resume_versions rv ON a.resume_version_id = rv.id
       WHERE a.user_id = ? AND a.job_id = ?`,
      [userId, jobId]
    );
    return (row || null) as Application | null;
  }

  async findByUserId(userId: string): Promise<Application[]> {
    const db = await getDatabase();
    return (await db.all(
      `SELECT 
         a.*,
         j.title as job_title,
         j.company_name,
         j.location,
         j.apply_url,
         rv.label as resume_version_label
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       LEFT JOIN resume_versions rv ON a.resume_version_id = rv.id
       WHERE a.user_id = ?
       ORDER BY a.applied_at DESC`,
      [userId]
    )) as Application[];
  }

  async findByResumeVersionId(userId: string, resumeVersionId: string): Promise<Application[]> {
    const db = await getDatabase();
    return (await db.all(
      `SELECT 
         a.*,
         j.title as job_title,
         j.company_name,
         j.location,
         j.apply_url,
         rv.label as resume_version_label
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       LEFT JOIN resume_versions rv ON a.resume_version_id = rv.id
       WHERE a.user_id = ? AND a.resume_version_id = ?
       ORDER BY a.applied_at DESC`,
      [userId, resumeVersionId]
    )) as Application[];
  }

  async updateResumeVersion(applicationId: string, resumeVersionId: string): Promise<void> {
    const db = await getDatabase();
    await db.run(
      `UPDATE applications 
       SET resume_version_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [resumeVersionId, applicationId]
    );
  }

  async updateStageStatus(applicationId: string, stageStatus: ApplicationStage): Promise<void> {
    const db = await getDatabase();
    await db.run(
      `UPDATE applications 
       SET stage_status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [stageStatus, applicationId]
    );
  }

  async updateStatus(applicationId: string, userId: string, status: string): Promise<Application | null> {
    const db = await getDatabase();
    const isInterview = status === 'interview' ? 1 : 0;
    const isRejected = status === 'rejected' ? 1 : 0;
    const isOffer = status === 'offer' ? 1 : 0;

    const result = await db.run(
      `UPDATE applications 
       SET 
         status = ?, 
         interview_scheduled = ?,
         rejected = ?,
         offer_received = ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [status, isInterview, isRejected, isOffer, applicationId, userId]
    );
    
    if (!result.changes || result.changes === 0) {
      return null;
    }

    return (await db.get(`SELECT * FROM applications WHERE id = ? AND user_id = ?`, [applicationId, userId])) as Application | null;
  }

  async getStats(userId: string) {
    const db = await getDatabase();
    const result = await db.get(
      `SELECT 
         SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied,
         SUM(CASE WHEN interview_scheduled = 1 THEN 1 ELSE 0 END) as interviews,
         SUM(CASE WHEN rejected = 1 THEN 1 ELSE 0 END) as rejected,
         SUM(CASE WHEN offer_received = 1 THEN 1 ELSE 0 END) as offers
       FROM applications
       WHERE user_id = ?`,
      [userId]
    );
    return {
      applied: result?.applied || 0,
      interviews: result?.interviews || 0,
      rejected: result?.rejected || 0,
      offers: result?.offers || 0
    };
  }
}
