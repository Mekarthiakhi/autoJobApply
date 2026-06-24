import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { getDatabase } from '../config/database.js';
import { aiMatchingService } from '../services/aiMatchingService.js';
import { MatchScoreRepository } from '../repositories/matchScoreRepository.js';

const matchScoreRepository = new MatchScoreRepository();

export function startAIMatchingJob() {
  // Run every hour
  cron.schedule('15 * * * *', async () => {
    logger.info('🤖 Starting AI matching...');
    
    try {
      const sql = getDatabase();
      
      // Get jobs that have not been matched for at least one user with a resume
      const unmatchedJobs = await sql`
        SELECT DISTINCT j.*
        FROM jobs j
        CROSS JOIN users u
        JOIN resumes r ON u.id = r.user_id
        LEFT JOIN match_scores ms ON j.id = ms.job_id AND ms.user_id = u.id
        WHERE ms.id IS NULL
        LIMIT 10
      `;

      for (const job of unmatchedJobs) {
        try {
          // Get all users who don't have a match score for this job and have a resume
          const usersToMatch = await sql`
            SELECT u.id, r.text_content
            FROM users u
            JOIN resumes r ON u.id = r.user_id
            LEFT JOIN match_scores ms ON ms.job_id = ${job.id} AND ms.user_id = u.id
            WHERE ms.id IS NULL
          `;
          
          for (const user of usersToMatch) {
            if (user.text_content) {
              logger.info(`🤖 Analyzing match for user ${user.id} and job ${job.id}`);
              const result = await aiMatchingService.analyzeJobMatch(
                user.text_content,
                job.job_description,
                job.title,
                job.required_skills
              );

              await matchScoreRepository.create(
                user.id,
                job.id,
                result.score,
                result.missingSkills,
                result.matchingSkills,
                result.strengths,
                result.recommendation
              );
            }
          }
        } catch (error) {
          logger.error(`AI matching error for job ${job.id}`, error);
        }
      }

      logger.info('✨ AI matching complete');
    } catch (error) {
      logger.error('AI matching job error', error);
    }
  });

  logger.info('✅ AI matching scheduler started');
}
