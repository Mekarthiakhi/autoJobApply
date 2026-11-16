import { getDatabase } from '../config/database.js';

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  company?: string;
  platform?: string;
  role?: string;
  status?: string;
}

export interface DashboardMetrics {
  totalJobsDiscovered: number;
  jobsShortlisted: number;
  applicationsPrepared: number;
  applicationsAwaitingReview: number;
  applicationsApproved: number;
  applicationsSubmitted: number;
  failedApplications: number;
  interviewInvitations: number;
  rejectionRate: number; // percentage (0-100)
  applicationConversionRate: number; // percentage (0-100)
  avgTimeDiscoveryToSubmissionHours: number | null;
  avgTimeDiscoveryToSubmissionFormatted: string;
}

export interface SourcePerformance {
  source: string;
  discoveredCount: number;
  preparedCount: number;
  submittedCount: number;
  interviewsCount: number;
  offersCount: number;
  rejectionsCount: number;
  conversionRate: number; // submitted -> interviews/offers %
}

export interface AgentExecutionMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  errorRate: number;
  byAgent: Array<{
    agent: string;
    runs: number;
    errors: number;
    successRate: number;
  }>;
  recentErrors: Array<{
    id: string;
    action: string;
    details: any;
    created_at: string;
    job_title?: string;
    company_name?: string;
  }>;
}

export interface PendingCandidateActionItem {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  stageStatus: string;
  actionRequired: 'VERIFY_ANSWERS' | 'PROVIDE_MISSING_INFO' | 'EXPIRING_SOON';
  details: string;
  expiresAt?: string;
  missingFieldsCount?: number;
  uncertainFieldsCount?: number;
}

export interface WorkflowHistoryItem {
  id: string;
  timestamp: string;
  action: string;
  status: string;
  jobTitle?: string;
  companyName?: string;
  details?: any;
}

export class AnalyticsService {
  /**
   * Helper to build filter clauses for jobs and applications
   */
  private buildFilterClauses(
    filters: AnalyticsFilters, 
    jobPrefix: string = 'j', 
    appPrefix: string = 'a'
  ): { clauses: string[]; params: unknown[] } {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filters.startDate) {
      clauses.push(`${appPrefix ? `COALESCE(${appPrefix}.created_at, ${appPrefix}.applied_at)` : `${jobPrefix}.created_at`} >= ?`);
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      clauses.push(`${appPrefix ? `COALESCE(${appPrefix}.created_at, ${appPrefix}.applied_at)` : `${jobPrefix}.created_at`} <= ?`);
      params.push(filters.endDate);
    }
    if (filters.company) {
      clauses.push(`${jobPrefix}.company_name LIKE ?`);
      params.push(`%${filters.company}%`);
    }
    if (filters.platform) {
      clauses.push(`LOWER(${jobPrefix}.source) = LOWER(?)`);
      params.push(filters.platform);
    }
    if (filters.role) {
      clauses.push(`${jobPrefix}.title LIKE ?`);
      params.push(`%${filters.role}%`);
    }
    if (filters.status && appPrefix) {
      clauses.push(`(${appPrefix}.stage_status = ? OR ${appPrefix}.status = ?)`);
      params.push(filters.status, filters.status);
    }

    return { clauses, params };
  }

  /**
   * Calculate all 11 core metrics from real DB records
   */
  async getDashboardMetrics(userId: string, filters: AnalyticsFilters = {}): Promise<DashboardMetrics> {
    const db = await getDatabase();

    // 1. Total jobs discovered (filtered by date, company, platform, role if provided)
    const jobClauses: string[] = [];
    const jobParams: unknown[] = [];
    if (filters.startDate) {
      jobClauses.push('created_at >= ?');
      jobParams.push(filters.startDate);
    }
    if (filters.endDate) {
      jobClauses.push('created_at <= ?');
      jobParams.push(filters.endDate);
    }
    if (filters.company) {
      jobClauses.push('company_name LIKE ?');
      jobParams.push(`%${filters.company}%`);
    }
    if (filters.platform) {
      jobClauses.push('LOWER(source) = LOWER(?)');
      jobParams.push(filters.platform);
    }
    if (filters.role) {
      jobClauses.push('title LIKE ?');
      jobParams.push(`%${filters.role}%`);
    }

    const jobWhere = jobClauses.length > 0 ? `WHERE ${jobClauses.join(' AND ')}` : '';
    const totalJobsRow = await db.get(
      `SELECT COUNT(DISTINCT id) as count FROM jobs ${jobWhere}`,
      jobParams
    );
    const totalJobsDiscovered = totalJobsRow?.count || 0;

    // 2. Jobs shortlisted for this user (match score >= 70 or in user applications)
    const { clauses: jobFilterClauses, params: jobFilterParams } = this.buildFilterClauses(filters, 'j', '');
    const shortlistQuery = `
      SELECT COUNT(DISTINCT j.id) as count
      FROM jobs j
      LEFT JOIN match_scores m ON m.job_id = j.id AND m.user_id = ?
      LEFT JOIN applications a ON a.job_id = j.id AND a.user_id = ?
      WHERE (m.match_score >= 70 OR a.id IS NOT NULL)
      ${jobFilterClauses.length > 0 ? `AND ${jobFilterClauses.join(' AND ')}` : ''}
    `;
    const shortlistRow = await db.get(shortlistQuery, [userId, userId, ...jobFilterParams]);
    const jobsShortlisted = shortlistRow?.count || 0;

    // 3. Application Metrics (Prepared, Awaiting Review, Approved, Submitted, Failed, Interviews, Rejections)
    const { clauses: appClauses, params: appParams } = this.buildFilterClauses(filters, 'j', 'a');
    const appWhere = ['a.user_id = ?', ...appClauses].join(' AND ');

    const appStatsQuery = `
      SELECT 
        COUNT(DISTINCT a.id) as total_applications,
        
        -- Prepared applications: drafted or beyond
        SUM(CASE 
          WHEN a.stage_status IN ('DRAFTING', 'READY_FOR_REVIEW', 'NEEDS_CANDIDATE_INPUT', 'APPROVED', 'SUBMITTING', 'SUBMITTED', 'FAILED') 
               OR a.resume_version_id IS NOT NULL 
          THEN 1 ELSE 0 
        END) as prepared,
        
        -- Awaiting review: ready for review or needs input
        SUM(CASE 
          WHEN a.stage_status IN ('READY_FOR_REVIEW', 'NEEDS_CANDIDATE_INPUT')
               OR (a.review_status = 'pending' AND a.stage_status NOT IN ('APPROVED', 'SUBMITTED', 'REJECTED'))
          THEN 1 ELSE 0 
        END) as awaiting_review,
        
        -- Approved: explicit candidate approval granted
        SUM(CASE 
          WHEN a.stage_status = 'APPROVED' 
               OR (a.approved_draft_hash IS NOT NULL AND a.stage_status NOT IN ('REJECTED'))
          THEN 1 ELSE 0 
        END) as approved,
        
        -- Submitted: successfully applied on platform
        SUM(CASE 
          WHEN a.stage_status = 'SUBMITTED' 
               OR a.status IN ('applied', 'submitted', 'interview', 'offer')
          THEN 1 ELSE 0 
        END) as submitted,
        
        -- Failed applications
        SUM(CASE 
          WHEN a.stage_status = 'FAILED' 
               OR a.status = 'failed' 
               OR a.last_submission_error IS NOT NULL
          THEN 1 ELSE 0 
        END) as failed,
        
        -- Interview invitations
        SUM(CASE 
          WHEN a.interview_scheduled = 1 
               OR a.status = 'interview' 
          THEN 1 ELSE 0 
        END) as interviews,

        -- Offers
        SUM(CASE 
          WHEN a.offer_received = 1 
               OR a.status = 'offer' 
          THEN 1 ELSE 0 
        END) as offers,
        
        -- Rejections
        SUM(CASE 
          WHEN a.rejected = 1 
               OR a.status = 'rejected' 
               OR a.stage_status = 'REJECTED'
          THEN 1 ELSE 0 
        END) as rejections
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE ${appWhere}
    `;

    const stats = await db.get(appStatsQuery, [userId, ...appParams]);

    const applicationsPrepared = stats?.prepared || 0;
    const applicationsAwaitingReview = stats?.awaiting_review || 0;
    const applicationsApproved = stats?.approved || 0;
    const applicationsSubmitted = stats?.submitted || 0;
    const failedApplications = stats?.failed || 0;
    const interviewInvitations = stats?.interviews || 0;
    const offersCount = stats?.offers || 0;
    const rejectionsCount = stats?.rejections || 0;

    // Rates calculation with strict division safety
    const totalTerminalOrSubmitted = applicationsSubmitted + rejectionsCount;
    const rejectionRate = totalTerminalOrSubmitted > 0
      ? Math.round((rejectionsCount / totalTerminalOrSubmitted) * 1000) / 10
      : 0;

    const applicationConversionRate = applicationsSubmitted > 0
      ? Math.round(((interviewInvitations + offersCount) / applicationsSubmitted) * 1000) / 10
      : 0;

    // 4. Average Time from Discovery to Submission
    const timeQuery = `
      SELECT 
        AVG(ABS(julianday(a.applied_at) - julianday(COALESCE(a.created_at, j.created_at))) * 24.0) as avg_hours
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.user_id = ?
        AND (a.stage_status = 'SUBMITTED' OR a.status IN ('applied', 'submitted', 'interview', 'offer'))
        AND a.applied_at IS NOT NULL
        ${appClauses.length > 0 ? `AND ${appClauses.join(' AND ')}` : ''}
    `;
    const timeRow = await db.get(timeQuery, [userId, ...appParams]);
    const avgHoursRaw = timeRow?.avg_hours != null ? Number(timeRow.avg_hours) : null;
    const avgTimeDiscoveryToSubmissionHours = avgHoursRaw !== null && !isNaN(avgHoursRaw) && avgHoursRaw >= 0
      ? Math.round(avgHoursRaw * 10) / 10
      : null;

    let avgTimeDiscoveryToSubmissionFormatted = 'N/A';
    if (avgTimeDiscoveryToSubmissionHours !== null) {
      if (avgTimeDiscoveryToSubmissionHours < 1) {
        const mins = Math.max(1, Math.round(avgTimeDiscoveryToSubmissionHours * 60));
        avgTimeDiscoveryToSubmissionFormatted = `${mins} mins`;
      } else if (avgTimeDiscoveryToSubmissionHours < 24) {
        avgTimeDiscoveryToSubmissionFormatted = `${avgTimeDiscoveryToSubmissionHours} hrs`;
      } else {
        const days = Math.round((avgTimeDiscoveryToSubmissionHours / 24) * 10) / 10;
        avgTimeDiscoveryToSubmissionFormatted = `${days} days`;
      }
    }

    return {
      totalJobsDiscovered,
      jobsShortlisted,
      applicationsPrepared,
      applicationsAwaitingReview,
      applicationsApproved,
      applicationsSubmitted,
      failedApplications,
      interviewInvitations,
      rejectionRate,
      applicationConversionRate,
      avgTimeDiscoveryToSubmissionHours,
      avgTimeDiscoveryToSubmissionFormatted,
    };
  }

  /**
   * Source performance comparison
   */
  async getSourcePerformance(userId: string, filters: AnalyticsFilters = {}): Promise<SourcePerformance[]> {
    const db = await getDatabase();
    const { clauses, params } = this.buildFilterClauses(filters, 'j', 'a');
    const whereClause = clauses.length > 0 ? `AND ${clauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        COALESCE(LOWER(j.source), 'direct') as source,
        COUNT(DISTINCT j.id) as discovered_count,
        SUM(CASE 
          WHEN a.stage_status IN ('DRAFTING', 'READY_FOR_REVIEW', 'NEEDS_CANDIDATE_INPUT', 'APPROVED', 'SUBMITTING', 'SUBMITTED', 'FAILED') 
               OR a.resume_version_id IS NOT NULL 
          THEN 1 ELSE 0 
        END) as prepared_count,
        SUM(CASE 
          WHEN a.stage_status = 'SUBMITTED' 
               OR a.status IN ('applied', 'submitted', 'interview', 'offer')
          THEN 1 ELSE 0 
        END) as submitted_count,
        SUM(CASE 
          WHEN a.interview_scheduled = 1 OR a.status = 'interview' 
          THEN 1 ELSE 0 
        END) as interviews_count,
        SUM(CASE 
          WHEN a.offer_received = 1 OR a.status = 'offer' 
          THEN 1 ELSE 0 
        END) as offers_count,
        SUM(CASE 
          WHEN a.rejected = 1 OR a.status = 'rejected' OR a.stage_status = 'REJECTED'
          THEN 1 ELSE 0 
        END) as rejections_count
      FROM jobs j
      LEFT JOIN applications a ON a.job_id = j.id AND a.user_id = ?
      WHERE 1=1 ${whereClause}
      GROUP BY COALESCE(LOWER(j.source), 'direct')
      ORDER BY discovered_count DESC
    `;

    const rows = await db.all(query, [userId, ...params]);

    return (rows as any[]).map(r => {
      const submitted = Number(r.submitted_count) || 0;
      const interviews = Number(r.interviews_count) || 0;
      const offers = Number(r.offers_count) || 0;
      const conversionRate = submitted > 0
        ? Math.round(((interviews + offers) / submitted) * 1000) / 10
        : 0;

      return {
        source: r.source || 'unknown',
        discoveredCount: Number(r.discovered_count) || 0,
        preparedCount: Number(r.prepared_count) || 0,
        submittedCount: submitted,
        interviewsCount: interviews,
        offersCount: offers,
        rejectionsCount: Number(r.rejections_count) || 0,
        conversionRate,
      };
    });
  }

  /**
   * Agent execution activity and error metrics
   */
  async getAgentExecutionMetrics(userId: string, filters: AnalyticsFilters = {}): Promise<AgentExecutionMetrics> {
    const db = await getDatabase();
    const clauses: string[] = ['user_id = ?'];
    const params: unknown[] = [userId];

    if (filters.startDate) {
      clauses.push('created_at >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      clauses.push('created_at <= ?');
      params.push(filters.endDate);
    }

    const where = clauses.join(' AND ');

    // Totals
    const totalRow = await db.get(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('success', 'completed') THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status IN ('failed', 'error') THEN 1 ELSE 0 END) as failed
       FROM activity_logs
       WHERE ${where}`,
      params
    );

    const totalExecutions = Number(totalRow?.total) || 0;
    const successfulExecutions = Number(totalRow?.success) || 0;
    const failedExecutions = Number(totalRow?.failed) || 0;
    const errorRate = totalExecutions > 0
      ? Math.round((failedExecutions / totalExecutions) * 1000) / 10
      : 0;

    // Breakdown by action / agent
    const byAgentRows = await db.all(
      `SELECT 
        action,
        COUNT(*) as runs,
        SUM(CASE WHEN status IN ('failed', 'error') THEN 1 ELSE 0 END) as errors
       FROM activity_logs
       WHERE ${where}
       GROUP BY action
       ORDER BY runs DESC`,
      params
    );

    const byAgent = (byAgentRows as any[]).map(r => {
      const runs = Number(r.runs) || 0;
      const errors = Number(r.errors) || 0;
      const successRate = runs > 0
        ? Math.round(((runs - errors) / runs) * 1000) / 10
        : 100;
      return {
        agent: r.action,
        runs,
        errors,
        successRate,
      };
    });

    // Recent errors (last 10)
    const recentErrorRows = await db.all(
      `SELECT al.id, al.action, al.details, al.created_at, j.title as job_title, j.company_name
       FROM activity_logs al
       LEFT JOIN jobs j ON al.job_id = j.id
       WHERE ${clauses.map(c => `al.${c}`).join(' AND ')}
         AND al.status IN ('failed', 'error')
       ORDER BY al.created_at DESC
       LIMIT 10`,
      params
    );

    const recentErrors = (recentErrorRows as any[]).map(r => {
      let parsedDetails = r.details;
      try {
        if (typeof r.details === 'string') parsedDetails = JSON.parse(r.details);
      } catch {
        parsedDetails = r.details;
      }
      return {
        id: r.id,
        action: r.action,
        details: parsedDetails,
        created_at: r.created_at,
        job_title: r.job_title,
        company_name: r.company_name,
      };
    });

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      errorRate,
      byAgent,
      recentErrors,
    };
  }

  /**
   * Pending candidate actions
   */
  async getPendingCandidateActions(userId: string): Promise<PendingCandidateActionItem[]> {
    const db = await getDatabase();

    const query = `
      SELECT 
        a.id as application_id,
        a.job_id,
        a.stage_status,
        a.approval_expires_at,
        a.missing_fields,
        a.uncertain_fields,
        j.title as job_title,
        j.company_name
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.user_id = ?
        AND (
          a.stage_status IN ('READY_FOR_REVIEW', 'NEEDS_CANDIDATE_INPUT')
          OR (a.stage_status = 'APPROVED' AND a.approval_expires_at IS NOT NULL AND datetime(a.approval_expires_at) < datetime('now', '+4 hours'))
        )
      ORDER BY 
        CASE 
          WHEN a.stage_status = 'NEEDS_CANDIDATE_INPUT' THEN 1
          WHEN a.stage_status = 'READY_FOR_REVIEW' THEN 2
          ELSE 3
        END,
        a.updated_at DESC
      LIMIT 20
    `;

    const rows = await db.all(query, [userId]);

    return (rows as any[]).map(r => {
      let missingList = [];
      let uncertainList = [];
      try { missingList = JSON.parse(r.missing_fields || '[]'); } catch { /* ignore */ }
      try { uncertainList = JSON.parse(r.uncertain_fields || '[]'); } catch { /* ignore */ }

      let actionRequired: 'VERIFY_ANSWERS' | 'PROVIDE_MISSING_INFO' | 'EXPIRING_SOON' = 'VERIFY_ANSWERS';
      let details = 'Application draft prepared. Review and verify answers to authorize submission.';

      if (r.stage_status === 'NEEDS_CANDIDATE_INPUT' || missingList.length > 0) {
        actionRequired = 'PROVIDE_MISSING_INFO';
        details = `${missingList.length} required field(s) require candidate input before draft can be authorized.`;
      } else if (r.stage_status === 'APPROVED' && r.approval_expires_at) {
        actionRequired = 'EXPIRING_SOON';
        details = `Approval expires soon (${new Date(r.approval_expires_at).toLocaleTimeString()}). Submit soon or refresh authorization.`;
      }

      return {
        applicationId: r.application_id,
        jobId: r.job_id,
        jobTitle: r.job_title,
        companyName: r.company_name,
        stageStatus: r.stage_status,
        actionRequired,
        details,
        expiresAt: r.approval_expires_at,
        missingFieldsCount: missingList.length,
        uncertainFieldsCount: uncertainList.length,
      };
    });
  }

  /**
   * Recent workflow history
   */
  async getRecentWorkflowHistory(
    userId: string, 
    limit: number = 15, 
    offset: number = 0
  ): Promise<{ items: WorkflowHistoryItem[]; total: number }> {
    const db = await getDatabase();

    const countRow = await db.get(
      `SELECT COUNT(*) as total FROM activity_logs WHERE user_id = ?`,
      [userId]
    );
    const total = Number(countRow?.total) || 0;

    const rows = await db.all(
      `SELECT al.id, al.action, al.status, al.details, al.created_at, j.title as job_title, j.company_name
       FROM activity_logs al
       LEFT JOIN jobs j ON al.job_id = j.id
       WHERE al.user_id = ?
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const items = (rows as any[]).map(r => {
      let parsed = r.details;
      try {
        if (typeof r.details === 'string') parsed = JSON.parse(r.details);
      } catch {
        parsed = r.details;
      }

      return {
        id: r.id,
        timestamp: r.created_at,
        action: r.action,
        status: r.status,
        jobTitle: r.job_title,
        companyName: r.company_name,
        details: parsed,
      };
    });

    return { items, total };
  }

  /**
   * Conversion Pipeline Funnel stages
   */
  async getFunnelStages(userId: string, filters: AnalyticsFilters = {}) {
    const metrics = await this.getDashboardMetrics(userId, filters);

    const stages = [
      {
        name: 'Jobs Discovered',
        count: metrics.totalJobsDiscovered,
        percentage: 100,
        description: 'New jobs crawled and indexed across all platforms',
      },
      {
        name: 'Shortlisted',
        count: metrics.jobsShortlisted,
        percentage: metrics.totalJobsDiscovered > 0
          ? Math.round((metrics.jobsShortlisted / metrics.totalJobsDiscovered) * 1000) / 10
          : 0,
        description: 'Matches scoring >= 70% compatibility',
      },
      {
        name: 'Applications Prepared',
        count: metrics.applicationsPrepared,
        percentage: metrics.totalJobsDiscovered > 0
          ? Math.round((metrics.applicationsPrepared / metrics.totalJobsDiscovered) * 1000) / 10
          : 0,
        description: 'Tailored resume, cover letter, and draft answers prepared',
      },
      {
        name: 'Approved by Candidate',
        count: metrics.applicationsApproved,
        percentage: metrics.applicationsPrepared > 0
          ? Math.round((metrics.applicationsApproved / metrics.applicationsPrepared) * 1000) / 10
          : 0,
        description: 'Explicit human verification with SHA-256 hash binding',
      },
      {
        name: 'Submitted to Platform',
        count: metrics.applicationsSubmitted,
        percentage: metrics.applicationsApproved > 0
          ? Math.round((metrics.applicationsSubmitted / metrics.applicationsApproved) * 1000) / 10
          : 0,
        description: 'Controlled browser execution confirmed on job portal',
      },
      {
        name: 'Interviews Scheduled',
        count: metrics.interviewInvitations,
        percentage: metrics.applicationsSubmitted > 0
          ? Math.round((metrics.interviewInvitations / metrics.applicationsSubmitted) * 1000) / 10
          : 0,
        description: 'Interview rounds or screening calls confirmed',
      },
    ];

    return stages;
  }
}

export const analyticsService = new AnalyticsService();
