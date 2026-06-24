import { getDatabase, isDatabaseAvailable } from '../config/database.js';

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

const mockMatchScores: MatchScore[] = [];

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
    if (!isDatabaseAvailable()) {
      const existing = mockMatchScores.findIndex(m => m.user_id === userId && m.job_id === jobId);
      const entry: MatchScore = {
        id: Math.random().toString(36).substring(7),
        user_id: userId,
        job_id: jobId,
        match_score: score,
        missing_skills: missingSkills,
        matching_skills: matchingSkills,
        strengths,
        recommendation,
        analyzed_at: new Date(),
      };
      if (existing !== -1) {
        mockMatchScores[existing] = entry;
      } else {
        mockMatchScores.push(entry);
      }
      return entry;
    }
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
    return result[0] as MatchScore;
  }

  async findByUserAndJob(userId: string, jobId: string): Promise<MatchScore | null> {
    if (!isDatabaseAvailable()) {
      return mockMatchScores.find(m => m.user_id === userId && m.job_id === jobId) || null;
    }
    const sql = getDatabase();
    const result = await sql`
      SELECT * FROM match_scores 
      WHERE user_id = ${userId} AND job_id = ${jobId}
    `;
    return (result[0] as MatchScore) || null;
  }

  async findTopMatches(userId: string, limit: number = 20): Promise<MatchScore[]> {
    if (!isDatabaseAvailable()) {
      return mockMatchScores
        .filter(m => m.user_id === userId)
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, limit);
    }
    const sql = getDatabase();
    return sql`
      SELECT * FROM match_scores 
      WHERE user_id = ${userId}
      ORDER BY match_score DESC 
      LIMIT ${limit}
    ` as unknown as MatchScore[];
  }
}

