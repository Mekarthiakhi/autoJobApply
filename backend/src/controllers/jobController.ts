import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { JobRepository } from '../repositories/jobRepository.js';
import { MatchScoreRepository } from '../repositories/matchScoreRepository.js';
import { savedSearchRepository } from '../repositories/savedSearchRepository.js';
import { jobNormalizer } from '../discovery/jobNormalizer.js';
import { explainableScorer } from '../discovery/explainableScorer.js';
import { multiPortalAggregator } from '../discovery/multiPortalAggregator.js';
import { AppError } from '../middleware/errorHandler.js';
import { getDatabase } from '../config/database.js';

const jobRepository = new JobRepository();
const matchScoreRepository = new MatchScoreRepository();

export async function getJobPortals(_req: Request, res: Response) {
  res.json({ portals: multiPortalAggregator.getPortalStatuses() });
}

export async function getJobStats(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');
    const db = await getDatabase();
    const stats = await db.get(
      `SELECT 
         COUNT(*) as totalJobs,
         COUNT(CASE WHEN status = 'shortlisted' THEN 1 END) as shortlistedJobs,
         COUNT(CASE WHEN status = 'applied' THEN 1 END) as appliedJobs
       FROM jobs`
    );
    res.json(stats || { totalJobs: 0, shortlistedJobs: 0, appliedJobs: 0 });
  } catch (error) {
    console.error('Failed to fetch job stats:', error);
    res.status(500).json({ error: 'Failed to fetch job stats' });
  }
}

export async function ensureCandidateJobMatches(userId: string): Promise<{
  hasResume: boolean;
  skills: string[];
  preferredLocations: string[];
  targetRoles: string[];
  minMatchScore: number;
  scoredCount: number;
}> {
  const db = await getDatabase();
  const resume = await db.get<{ text_content: string; skills: string }>(
    `SELECT text_content, skills FROM resume_versions WHERE user_id = ? AND is_default = 1
     UNION ALL
     SELECT text_content, skills FROM resumes WHERE user_id = ?
     LIMIT 1`,
    [userId, userId]
  );
  const user = await db.get<{ preferred_locations: string; employment_type: string; min_match_score: number }>(
    `SELECT preferred_locations, employment_type, min_match_score FROM users WHERE id = ?`,
    [userId]
  );
  const settings = await db.get<{ target_roles: string; target_locations: string; min_salary: string }>(
    `SELECT target_roles, target_locations, min_salary FROM settings WHERE user_id = ?`,
    [userId]
  );

  let candidateSkills: string[] = [];
  if (resume?.skills) {
    try {
      candidateSkills = JSON.parse(resume.skills);
    } catch {
      candidateSkills = String(resume.skills).split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  let preferredLocations: string[] = ['Remote'];
  if (user?.preferred_locations) {
    try {
      preferredLocations = JSON.parse(user.preferred_locations);
    } catch {
      preferredLocations = [user.preferred_locations];
    }
  }

  let targetRoles: string[] = [];
  if (settings?.target_roles) {
    try {
      targetRoles = JSON.parse(settings.target_roles);
    } catch {}
  }

  // If candidate has resume or target preferences, score any unscored jobs
  const unscoredJobs = await db.all<any[]>(
    `SELECT j.* FROM jobs j
     LEFT JOIN match_scores ms ON j.id = ms.job_id AND ms.user_id = ?
     WHERE ms.id IS NULL AND j.status != 'expired'
     LIMIT 100`,
    [userId]
  );

  if (unscoredJobs && unscoredJobs.length > 0) {
    for (const job of unscoredJobs) {
      try {
        const normalized = jobNormalizer.normalize(job);
        const scoreResult = explainableScorer.scoreJob(normalized, {
          skills: candidateSkills,
          targetRoles: targetRoles.length > 0 ? targetRoles : undefined,
          targetLocations: preferredLocations,
          minSalary: settings?.min_salary ? parseFloat(settings.min_salary.replace(/[^0-9.]/g, '')) : undefined,
          prefersRemote: preferredLocations.some((l) => /remote/i.test(l)) || true,
        });

        const candidateLower = candidateSkills.map((s) => s.toLowerCase());
        const jobSkills = normalized.requiredSkills || [];
        const matching = jobSkills.filter((js) => candidateLower.some((cs) => cs.includes(js.toLowerCase()) || js.toLowerCase().includes(cs)));
        const missing = jobSkills.filter((js) => !candidateLower.some((cs) => cs.includes(js.toLowerCase()) || js.toLowerCase().includes(cs)));

        const scoreId = uuidv4();
        await db.run(
          `INSERT INTO match_scores (id, user_id, job_id, match_score, missing_skills, matching_skills, strengths, recommendation, analyzed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, job_id) DO UPDATE SET
             match_score = excluded.match_score,
             missing_skills = excluded.missing_skills,
             matching_skills = excluded.matching_skills,
             strengths = excluded.strengths,
             recommendation = excluded.recommendation,
             analyzed_at = CURRENT_TIMESTAMP`,
          [
            scoreId,
            userId,
            job.id,
            scoreResult.totalScore,
            JSON.stringify(missing),
            JSON.stringify(matching),
            JSON.stringify(scoreResult.factors.filter((f) => f.score >= f.maxScore * 0.7).map((f) => f.name)),
            scoreResult.recommendation,
          ]
        );
      } catch (err) {
        console.warn(`Could not score job ${job.id} for user ${userId}`, err);
      }
    }
  }

  return {
    hasResume: Boolean(resume),
    skills: candidateSkills,
    preferredLocations,
    targetRoles,
    minMatchScore: user?.min_match_score || 55,
    scoredCount: unscoredJobs?.length || 0,
  };
}

export async function getJobs(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const profile = await ensureCandidateJobMatches(userId);

    const {
      keyword,
      location,
      remoteOnly,
      experienceLevel,
      employmentType,
      source,
      status,
      minMatchScore,
      profileMatchedOnly,
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
        profileMatchedOnly: profileMatchedOnly === 'true',
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
      userId
    );

    res.json({
      ...result,
      candidateProfile: profile,
    });
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
