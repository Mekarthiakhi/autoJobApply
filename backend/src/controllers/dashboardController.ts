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
