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
      
      // Get unmatched jobs
      const unmatchedJobs = await sql`
        SELECT j.*, r.text_content
        FROM jobs j
        LEFT JOIN resumes r ON true
        LEFT JOIN match_scores ms ON j.id = ms.job_id
        WHERE ms.id IS NULL
        LIMIT 10
      `;

      for (const job of unmatchedJobs) {
        try {
          const users = await sql`SELECT id FROM users LIMIT 10`;
          
          for (const user of users) {
            if (job.text_content) {
              const result = await aiMatchingService.analyzeJobMatch(
                job.text_content,
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
          logger.error('AI matching error for job', error);
        }
      }

      logger.info('✨ AI matching complete');
    } catch (error) {
      logger.error('AI matching job error', error);
    }
  });

  logger.info('✅ AI matching scheduler started');
}
