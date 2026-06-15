import { Request, Response } from 'express';
import { JobRepository } from '../repositories/jobRepository.js';
import { MatchScoreRepository } from '../repositories/matchScoreRepository.js';
import { AppError } from '../middleware/errorHandler.js';

const jobRepository = new JobRepository();
const matchScoreRepository = new MatchScoreRepository();

export async function getJobs(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { limit = 50, source } = req.query;
    const jobs = await jobRepository.findRecent(parseInt(limit as string));

    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
}

export async function getJobDetails(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { jobId } = req.params;
    const job = await jobRepository.findById(jobId);

    if (!job) throw new AppError(404, 'Job not found');

    const matchScore = await matchScoreRepository.findByUserAndJob(userId, jobId);

    res.json({
      ...job,
      matchScore,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch job details' });
    }
  }
}

export async function searchJobs(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { keywords } = req.body;
    const jobs = await jobRepository.findByKeywords(keywords);

    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search jobs' });
  }
}
