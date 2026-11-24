import { Request, Response } from 'express';
import { JobRepository } from '../repositories/jobRepository.js';
import { AppError } from '../middleware/errorHandler.js';
import { analyticsService, AnalyticsFilters } from '../services/analyticsService.js';
import { getDatabase } from '../config/database.js';

const jobRepository = new JobRepository();

export async function getDashboard(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    // Extract filters from query parameters
    const { startDate, endDate, company, platform, role, status } = req.query;
    const filters: AnalyticsFilters = {
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      company: company as string | undefined,
      platform: platform as string | undefined,
      role: role as string | undefined,
      status: status as string | undefined,
    };

    // 1. Fetch real DB metrics for all 11 core metrics
    const metrics = await analyticsService.getDashboardMetrics(userId, filters);

    // 2. Fetch pending candidate actions
    const pendingActions = await analyticsService.getPendingCandidateActions(userId);

    // 3. Fetch recent workflow history
    const recentWorkflow = await analyticsService.getRecentWorkflowHistory(userId, 8);

    // 4. Fetch source performance breakdown
    const sourcePerformance = await analyticsService.getSourcePerformance(userId, filters);

    // 5. Fetch recent jobs
    const recentJobs = await jobRepository.findRecent(5);

    // 6. Fetch live cron / scheduler status
    const db = await getDatabase();
    const settings = await db.get<{
      auto_apply_enabled: number;
      auto_apply_interval_hours: number;
      last_auto_apply_run_at: string | null;
    }>(
      `SELECT auto_apply_enabled, auto_apply_interval_hours, last_auto_apply_run_at FROM automation_settings WHERE user_id = ?`,
      [userId]
    );
    const intervalHours = Math.min(5, Math.max(1, Number(settings?.auto_apply_interval_hours) || 1));
    const lastRunAt = settings?.last_auto_apply_run_at || null;
    const nextRunAt = lastRunAt
      ? new Date(new Date(lastRunAt + (lastRunAt.endsWith('Z') ? '' : 'Z')).getTime() + intervalHours * 3600000).toISOString()
      : null;

    // Format response with both comprehensive Phase 11 metrics and backwards-compatible stats
    res.json({
      metrics,
      // Backwards-compatible stats object for legacy dashboard widgets
      stats: {
        totalJobsFound: metrics.totalJobsDiscovered,
        totalApplications: metrics.applicationsSubmitted,
        totalMatches: metrics.jobsShortlisted,
        successRate: metrics.applicationConversionRate,
        interviews: metrics.interviewInvitations,
        offers: Math.round(metrics.applicationsSubmitted * (metrics.applicationConversionRate / 100)),
        pendingReviews: metrics.applicationsAwaitingReview,
        prepared: metrics.applicationsPrepared,
        approved: metrics.applicationsApproved,
        failed: metrics.failedApplications,
        rejectionRate: metrics.rejectionRate,
        avgTimeToSubmit: metrics.avgTimeDiscoveryToSubmissionFormatted,
      },
      pendingActions,
      recentWorkflow: recentWorkflow.items,
      sourcePerformance,
      recentJobs,
      cronStatus: {
        enabled: settings ? settings.auto_apply_enabled !== 0 : true,
        intervalHours,
        lastRunAt,
        nextRunAt,
        isSchedulerActive: process.env.ENABLE_SCHEDULED_JOBS !== 'false',
        masterSchedule: 'Every hour (0 * * * *)',
      },
      filters,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Failed to fetch dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
  }
}

export async function getCardDetails(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { cardType, search, limit = '50' } = req.query;
    const db = await getDatabase();
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const searchFilter = search ? `%${String(search).trim()}%` : null;

    let items: any[] = [];
    let title = '';
    let category: 'jobs' | 'applications' = 'jobs';

    const normalizedType = String(cardType || '').toLowerCase();

    if (normalizedType.includes('discover') || normalizedType === 'jobs_discovered' || normalizedType === 'totaljobsdiscovered') {
      title = 'Total Jobs Discovered';
      category = 'jobs';
      let query = `
        SELECT j.id, j.title, j.company_name, j.location, j.salary, j.experience_level,
               j.source, j.apply_url, j.posted_date, j.created_at, j.required_skills,
               ms.match_score, ms.recommendation, ms.matching_skills, ms.missing_skills
        FROM jobs j
        LEFT JOIN match_scores ms ON j.id = ms.job_id AND ms.user_id = ?
        WHERE j.status != 'expired'
      `;
      const params: any[] = [userId];
      if (searchFilter) {
        query += ` AND (j.title LIKE ? OR j.company_name LIKE ? OR j.location LIKE ?)`;
        params.push(searchFilter, searchFilter, searchFilter);
      }
      query += ` ORDER BY CASE WHEN ms.match_score IS NOT NULL THEN 0 ELSE 1 END, ms.match_score DESC, j.posted_date DESC LIMIT ?`;
      params.push(limitNum);
      items = await db.all(query, params);
    } else if (normalizedType.includes('match') || normalizedType.includes('shortlist') || normalizedType === 'matched_jobs' || normalizedType === 'jobsshortlisted') {
      title = 'AI-Matched Jobs';
      category = 'jobs';
      let query = `
        SELECT j.id, j.title, j.company_name, j.location, j.salary, j.experience_level,
               j.source, j.apply_url, j.posted_date, j.created_at, j.required_skills,
               ms.match_score, ms.recommendation, ms.matching_skills, ms.missing_skills
        FROM jobs j
        JOIN match_scores ms ON j.id = ms.job_id AND ms.user_id = ?
        WHERE j.status != 'expired' AND (ms.match_score >= 60 OR ms.recommendation IN ('Apply', 'Maybe'))
      `;
      const params: any[] = [userId];
      if (searchFilter) {
        query += ` AND (j.title LIKE ? OR j.company_name LIKE ? OR j.location LIKE ?)`;
        params.push(searchFilter, searchFilter, searchFilter);
      }
      query += ` ORDER BY ms.match_score DESC, j.posted_date DESC LIMIT ?`;
      params.push(limitNum);
      items = await db.all(query, params);
    } else if (normalizedType.includes('prepared') || normalizedType === 'applications_prepared' || normalizedType === 'applicationsprepared') {
      title = 'Applications Prepared';
      category = 'applications';
      let query = `
        SELECT a.id, a.job_id, a.status, a.stage_status, a.match_score, a.applied_at, a.created_at,
               a.notes, a.external_status, a.submission_proof,
               j.title, j.company_name, j.location, j.source, j.apply_url,
               rv.label as resume_version_label, rv.id as resume_version_id
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        LEFT JOIN resume_versions rv ON a.resume_version_id = rv.id
        WHERE a.user_id = ? AND (
          a.stage_status IN ('DRAFTING', 'READY_FOR_REVIEW', 'NEEDS_CANDIDATE_INPUT', 'APPROVED', 'SUBMITTING', 'SUBMITTED', 'FAILED')
          OR a.resume_version_id IS NOT NULL
        )
      `;
      const params: any[] = [userId];
      if (searchFilter) {
        query += ` AND (j.title LIKE ? OR j.company_name LIKE ?)`;
        params.push(searchFilter, searchFilter);
      }
      query += ` ORDER BY a.updated_at DESC, a.created_at DESC LIMIT ?`;
      params.push(limitNum);
      items = await db.all(query, params);
    } else if (normalizedType.includes('review') || normalizedType === 'awaiting_review' || normalizedType === 'applicationsawaitingreview') {
      title = 'Applications Awaiting Review';
      category = 'applications';
      let query = `
        SELECT a.id, a.job_id, a.status, a.stage_status, a.match_score, a.applied_at, a.created_at,
               a.notes, a.external_status, a.submission_proof,
               j.title, j.company_name, j.location, j.source, j.apply_url,
               rv.label as resume_version_label, rv.id as resume_version_id
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        LEFT JOIN resume_versions rv ON a.resume_version_id = rv.id
        WHERE a.user_id = ? AND (
          a.stage_status IN ('READY_FOR_REVIEW', 'NEEDS_CANDIDATE_INPUT')
          OR (a.review_status = 'pending' AND a.stage_status NOT IN ('APPROVED', 'SUBMITTED', 'REJECTED'))
        )
      `;
      const params: any[] = [userId];
      if (searchFilter) {
        query += ` AND (j.title LIKE ? OR j.company_name LIKE ?)`;
        params.push(searchFilter, searchFilter);
      }
      query += ` ORDER BY a.updated_at DESC, a.created_at DESC LIMIT ?`;
      params.push(limitNum);
      items = await db.all(query, params);
    } else if (normalizedType.includes('approved') || normalizedType === 'applications_approved' || normalizedType === 'applicationsapproved') {
      title = 'Applications Approved';
      category = 'applications';
      let query = `
        SELECT a.id, a.job_id, a.status, a.stage_status, a.match_score, a.applied_at, a.created_at,
               a.notes, a.external_status, a.submission_proof, a.approved_draft_hash,
               j.title, j.company_name, j.location, j.source, j.apply_url,
               rv.label as resume_version_label, rv.id as resume_version_id
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        LEFT JOIN resume_versions rv ON a.resume_version_id = rv.id
        WHERE a.user_id = ? AND (
          a.stage_status = 'APPROVED'
          OR (a.approved_draft_hash IS NOT NULL AND a.stage_status NOT IN ('REJECTED'))
        )
      `;
      const params: any[] = [userId];
      if (searchFilter) {
        query += ` AND (j.title LIKE ? OR j.company_name LIKE ?)`;
        params.push(searchFilter, searchFilter);
      }
      query += ` ORDER BY a.updated_at DESC, a.created_at DESC LIMIT ?`;
      params.push(limitNum);
      items = await db.all(query, params);
    } else if (normalizedType.includes('submit') || normalizedType === 'applications_submitted' || normalizedType === 'applicationssubmitted') {
      title = 'Applications Submitted';
      category = 'applications';
      let query = `
        SELECT a.id, a.job_id, a.status, a.stage_status, a.match_score, a.applied_at, a.created_at,
               a.notes, a.external_status, a.submission_proof,
               j.title, j.company_name, j.location, j.source, j.apply_url,
               rv.label as resume_version_label, rv.id as resume_version_id
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        LEFT JOIN resume_versions rv ON a.resume_version_id = rv.id
        WHERE a.user_id = ? AND (
          a.stage_status = 'SUBMITTED'
          OR a.status IN ('applied', 'submitted', 'interview', 'offer')
        )
      `;
      const params: any[] = [userId];
      if (searchFilter) {
        query += ` AND (j.title LIKE ? OR j.company_name LIKE ?)`;
        params.push(searchFilter, searchFilter);
      }
      query += ` ORDER BY a.applied_at DESC, a.created_at DESC LIMIT ?`;
      params.push(limitNum);
      items = await db.all(query, params);
    } else if (normalizedType.includes('fail') || normalizedType === 'failed_applications' || normalizedType === 'failedapplications') {
      title = 'Failed Applications';
      category = 'applications';
      let query = `
        SELECT a.id, a.job_id, a.status, a.stage_status, a.match_score, a.applied_at, a.created_at,
               a.notes, a.external_status, a.submission_proof, a.last_submission_error,
               j.title, j.company_name, j.location, j.source, j.apply_url,
               rv.label as resume_version_label, rv.id as resume_version_id
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        LEFT JOIN resume_versions rv ON a.resume_version_id = rv.id
        WHERE a.user_id = ? AND (
          a.stage_status = 'FAILED'
          OR a.status = 'failed'
          OR a.last_submission_error IS NOT NULL
        )
      `;
      const params: any[] = [userId];
      if (searchFilter) {
        query += ` AND (j.title LIKE ? OR j.company_name LIKE ?)`;
        params.push(searchFilter, searchFilter);
      }
      query += ` ORDER BY a.updated_at DESC, a.created_at DESC LIMIT ?`;
      params.push(limitNum);
      items = await db.all(query, params);
    } else if (normalizedType.includes('interview') || normalizedType.includes('offer') || normalizedType === 'interview_invitations' || normalizedType === 'interviewinvitations') {
      title = 'Company Interviews & Offers';
      category = 'applications';
      let query = `
        SELECT a.id, a.job_id, a.status, a.stage_status, a.match_score, a.applied_at, a.created_at,
               a.notes, a.external_status, a.submission_proof,
               j.title, j.company_name, j.location, j.source, j.apply_url,
               rv.label as resume_version_label, rv.id as resume_version_id
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        LEFT JOIN resume_versions rv ON a.resume_version_id = rv.id
        WHERE a.user_id = ? AND (
          a.interview_scheduled = 1
          OR a.status IN ('interview', 'offer')
        )
      `;
      const params: any[] = [userId];
      if (searchFilter) {
        query += ` AND (j.title LIKE ? OR j.company_name LIKE ?)`;
        params.push(searchFilter, searchFilter);
      }
      query += ` ORDER BY a.updated_at DESC, a.created_at DESC LIMIT ?`;
      params.push(limitNum);
      items = await db.all(query, params);
    } else {
      throw new AppError(400, `Unknown card type: ${cardType}`);
    }

    res.json({
      cardType,
      title,
      category,
      total: items.length,
      items,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Failed to get card details:', error);
      res.status(500).json({ error: 'Failed to fetch card details' });
    }
  }
}
