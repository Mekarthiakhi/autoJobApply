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
    const sql = getDatabase();
    const result = await sql`
      INSERT INTO match_scores 
      (user_id, job_id, match_score, missing_skills, matching_skills, strengths, recommendation)
      VALUES (${userId}, ${jobId}, ${score}, ${missingSkills}, ${matchingSkills}, ${strengths}, ${recommendation})
      ON CONFLICT (user_id, job_id) DO UPDATE SET 
        match_score = ${score},
        missing_skills = ${missingSkills},
        matching_skills = ${matchingSkills},
        strengths = ${strengths},
        recommendation = ${recommendation},
        analyzed_at = NOW()
      RETURNING *
    `;
    return result[0];
  }

  async findByUserAndJob(userId: string, jobId: string): Promise<MatchScore | null> {
    const sql = getDatabase();
    const result = await sql`
      SELECT * FROM match_scores 
      WHERE user_id = ${userId} AND job_id = ${jobId}
    `;
    return result[0] || null;
  }

  async findTopMatches(userId: string, limit: number = 20): Promise<MatchScore[]> {
    const sql = getDatabase();
    return sql`
      SELECT * FROM match_scores 
      WHERE user_id = ${userId}
      ORDER BY match_score DESC 
      LIMIT ${limit}
    `;
  }
}
