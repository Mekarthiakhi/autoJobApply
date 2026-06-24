import { Request, Response } from 'express';
import { JobRepository } from '../repositories/jobRepository.js';
import { MatchScoreRepository } from '../repositories/matchScoreRepository.js';
import { AppError } from '../middleware/errorHandler.js';

const jobRepository = new JobRepository();
const matchScoreRepository = new MatchScoreRepository();

import { getDatabase } from '../config/database.js';

export async function getJobs(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { limit = 50 } = req.query;
    
    const sql = getDatabase();
    const jobs = await sql`
      SELECT j.*, ms.match_score, ms.recommendation, ms.missing_skills, ms.matching_skills, ms.strengths
      FROM jobs j
      LEFT JOIN match_scores ms ON j.id = ms.job_id AND ms.user_id = ${userId}
      ORDER BY j.posted_date DESC, j.created_at DESC
      LIMIT ${parseInt(limit as string)}
    `;

    res.json(jobs);
  } catch (error) {
    console.error('Failed to fetch jobs:', error);
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
    if (!Array.isArray(keywords) || keywords.length === 0) {
      throw new AppError(400, 'Keywords array required');
    }

    const sql = getDatabase();
    const formattedKeywords = keywords.map((k: string) => `%${k}%`);
    
    const jobs = await sql`
      SELECT j.*, ms.match_score, ms.recommendation, ms.missing_skills, ms.matching_skills, ms.strengths
      FROM jobs j
      LEFT JOIN match_scores ms ON j.id = ms.job_id AND ms.user_id = ${userId}
      WHERE j.title ILIKE ANY (${formattedKeywords})
         OR j.company_name ILIKE ANY (${formattedKeywords})
         OR j.job_description ILIKE ANY (${formattedKeywords})
      ORDER BY j.posted_date DESC
    `;

    res.json(jobs);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to search jobs' });
    }
  }
}
