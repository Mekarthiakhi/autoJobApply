import { getDatabase } from '../config/database.js';

export interface MatchScore {
  id: string;
  user_id: string;
  job_id: string;
  match_score: number;
  missing_skills: string[];
  matching_skills: string[];
  strengths: string[];
  recommendation: string;
  analyzed_at: Date;
}

export class MatchScoreRepository {
  async create(
    userId: string,
    jobId: string,
    score: number,
    missingSkills: string[],
    matchingSkills: string[],
    strengths: string[],
    recommendation: string,
  ): Promise<MatchScore> {
    return this.createOrUpdate(userId, jobId, score, missingSkills, matchingSkills, strengths, recommendation);
  }

  async createOrUpdate(
    userId: string,
    jobId: string,
    score: number,
    missingSkills: string[],
    matchingSkills: string[],
    strengths: string[],
    recommendation: string,
  ): Promise<MatchScore> {
    const db = await getDatabase();
    
    const missingSkillsJson = JSON.stringify(missingSkills);
    const matchingSkillsJson = JSON.stringify(matchingSkills);
    const strengthsJson = JSON.stringify(strengths);
    
    await db.run(
      `INSERT INTO match_scores 
       (user_id, job_id, match_score, missing_skills, matching_skills, strengths, recommendation)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, job_id) DO UPDATE SET 
        match_score = excluded.match_score,
        missing_skills = excluded.missing_skills,
        matching_skills = excluded.matching_skills,
        strengths = excluded.strengths,
        recommendation = excluded.recommendation,
        analyzed_at = CURRENT_TIMESTAMP`,
      [userId, jobId, score, missingSkillsJson, matchingSkillsJson, strengthsJson, recommendation]
    );
    
    return db.get(`SELECT * FROM match_scores WHERE user_id = ? AND job_id = ?`, [userId, jobId]) as any;
  }

  async findByUserAndJob(userId: string, jobId: string): Promise<MatchScore | null> {
    const db = await getDatabase();
    const result = await db.get(`SELECT * FROM match_scores WHERE user_id = ? AND job_id = ?`, [userId, jobId]);
    return (result || null) as any;
  }

  async findTopMatches(userId: string, limit: number = 20): Promise<MatchScore[]> {
    const db = await getDatabase();
    return await db.all(
      `SELECT * FROM match_scores 
       WHERE user_id = ?
       ORDER BY match_score DESC 
       LIMIT ?`,
      [userId, limit]
    ) as any;
  }
}
