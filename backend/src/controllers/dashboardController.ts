import { Request, Response } from 'express';
import { ApplicationRepository } from '../repositories/applicationRepository.js';
import { JobRepository } from '../repositories/jobRepository.js';
import { AppError } from '../middleware/errorHandler.js';

const applicationRepository = new ApplicationRepository();
const jobRepository = new JobRepository();

export async function getDashboard(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const stats = await applicationRepository.getStats(userId);
    const recentJobs = await jobRepository.findRecent(5);

    res.json({
      stats: {
        totalJobsFound: recentJobs.length,
        totalApplications: stats.applied || 0,
        totalMatches: 0,
        successRate: stats.offers && stats.applied ? ((stats.offers / stats.applied) * 100).toFixed(1) : 0,
        interviews: stats.interviews || 0,
        offers: stats.offers || 0,
      },
      recentJobs,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
  }
}
