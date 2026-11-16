import { Request, Response } from 'express';
import { JobRepository } from '../repositories/jobRepository.js';
import { MatchScoreRepository } from '../repositories/matchScoreRepository.js';
import { savedSearchRepository } from '../repositories/savedSearchRepository.js';
import { jobNormalizer } from '../discovery/jobNormalizer.js';
import { explainableScorer } from '../discovery/explainableScorer.js';
import { AppError } from '../middleware/errorHandler.js';
import { getDatabase } from '../config/database.js';

const jobRepository = new JobRepository();
const matchScoreRepository = new MatchScoreRepository();

export async function getJobs(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const {
      keyword,
      location,
      remoteOnly,
      experienceLevel,
      employmentType,
      source,
      status,
      minMatchScore,
      limit = '50',
      offset = '0',
    } = req.query;

    const result = await jobRepository.findWithFilters(
      {
        keyword: keyword as string,
        location: location as string,
        remoteOnly: remoteOnly === 'true',
        experienceLevel: experienceLevel as string,
        employmentType: employmentType as string,
        source: source as string,
        status: status as string,
        minMatchScore: minMatchScore ? parseInt(minMatchScore as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
      userId
    );

    res.json(result);
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

    const { keywords, location, remoteOnly, limit = 50 } = req.body;
    if (!Array.isArray(keywords) || keywords.length === 0) {
      throw new AppError(400, 'Keywords array required');
    }

    const keywordStr = keywords.join(' ');
    const result = await jobRepository.findWithFilters(
      {
        keyword: keywordStr,
        location,
        remoteOnly,
        limit,
      },
      userId
    );

    res.json(result.jobs);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to search jobs' });
    }
  }
}

/**
 * Returns explainable score breakdown showing why a job received its score.
 */
export async function getExplainableScore(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { jobId } = req.params;
    const job = await jobRepository.findById(jobId);
    if (!job) throw new AppError(404, 'Job not found');

    const db = await getDatabase();

    // Fetch candidate resume & settings isolated to authenticated user
    const resume = await db.get<{ text_content: string; skills: string }>(
      `SELECT text_content, skills
       FROM resume_versions
       WHERE user_id = ? AND is_default = 1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userId]
    );
    const settings = await db.get(`SELECT * FROM settings WHERE user_id = ?`, [userId]);

    let candidateSkills: string[] = [];
    if (resume?.skills) {
      try {
        candidateSkills = JSON.parse(resume.skills);
      } catch {
        candidateSkills = [];
      }
    }

    const normalized = jobNormalizer.normalize(job);
    const scoreResult = explainableScorer.scoreJob(normalized, {
      skills: candidateSkills,
      targetRoles: settings?.target_roles ? JSON.parse(settings.target_roles) : undefined,
      targetLocations: settings?.target_locations ? JSON.parse(settings.target_locations) : undefined,
      minSalary: settings?.min_salary ? parseFloat(settings.min_salary.replace(/[^0-9.]/g, '')) : undefined,
      prefersRemote: true,
    });

    res.json({
      jobId,
      jobTitle: job.title,
      companyName: job.company_name,
      ...scoreResult,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to calculate explainable score' });
    }
  }
}

// -------------------------------------------------------------
// Saved Searches Controllers
// -------------------------------------------------------------

export async function createSavedSearch(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { keyword, location, experience, salary, remote } = req.body;
    if (!keyword) throw new AppError(400, 'keyword is required');

    const saved = await savedSearchRepository.create(userId, {
      keyword,
      location,
      experience,
      salary,
      remote: Boolean(remote),
    });

    res.status(201).json(saved);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create saved search' });
    }
  }
}

export async function getSavedSearches(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const searches = await savedSearchRepository.findByUserId(userId);
    res.json(searches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch saved searches' });
  }
}

export async function deleteSavedSearch(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const deleted = await savedSearchRepository.delete(id, userId);

    if (!deleted) throw new AppError(404, 'Saved search not found');

    res.json({ message: 'Saved search deleted' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete saved search' });
    }
  }
}

export async function runSavedSearch(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const saved = await savedSearchRepository.findById(id);
    if (!saved || saved.user_id !== userId) throw new AppError(404, 'Saved search not found');

    const result = await jobRepository.findWithFilters(
      {
        keyword: saved.keyword,
        location: saved.location,
        remoteOnly: Boolean(saved.remote),
        experienceLevel: saved.experience || undefined,
      },
      userId
    );

    res.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to execute saved search' });
    }
  }
}
