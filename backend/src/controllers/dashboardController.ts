import { Request, Response } from 'express';
import { ApplicationRepository } from '../repositories/applicationRepository.js';
import { JobRepository } from '../repositories/jobRepository.js';
import { AppError } from '../middleware/errorHandler.js';

const applicationRepository = new ApplicationRepository();
const jobRepository = new JobRepository();

import { getDatabase } from '../config/database.js';

export async function getDashboard(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const sql = getDatabase();

    // 1. Total jobs in the database
    const jobsCount = await sql`SELECT COUNT(*)::integer as count FROM jobs`;
    const totalJobsFound = jobsCount[0]?.count || 0;

    // 2. Matches for the user
    const matchesCount = await sql`
      SELECT COUNT(*)::integer as count 
      FROM match_scores 
      WHERE user_id = ${userId}
    `;
    const totalMatches = matchesCount[0]?.count || 0;

    // 3. Applications statistics for the user
    const appStats = await sql`
      SELECT 
        COUNT(*)::integer as total,
        COUNT(*) FILTER (WHERE interview_scheduled = true)::integer as interviews,
        COUNT(*) FILTER (WHERE rejected = true)::integer as rejected,
        COUNT(*) FILTER (WHERE offer_received = true)::integer as offers
      FROM applications
      WHERE user_id = ${userId}
    `;
    
    const stats = appStats[0] || { total: 0, interviews: 0, rejected: 0, offers: 0 };
    const totalApplications = stats.total;
    const successRate = totalApplications > 0 
      ? Math.round((stats.offers / totalApplications) * 100) 
      : 0;

    const recentJobs = await jobRepository.findRecent(5);

    res.json({
      stats: {
        totalJobsFound,
        totalApplications,
        totalMatches,
        successRate,
        interviews: stats.interviews || 0,
        offers: stats.offers || 0,
      },
      recentJobs,
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
