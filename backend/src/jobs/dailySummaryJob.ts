import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { getDatabase } from '../config/database.js';
import { telegramService } from '../services/telegramService.js';

export function startDailySummaryJob() {
  // Run every day at 9 PM
  cron.schedule('0 21 * * *', async () => {
    logger.info('📊 Sending daily summaries...');
    
    try {
      const db = await getDatabase();
      
      const users = await db.all(
        `SELECT u.id, u.email, ast.telegram_chat_id
         FROM users u
         LEFT JOIN automation_settings ast ON u.id = ast.user_id
         WHERE ast.telegram_enabled = 1`
      );

      for (const user of users) {
        try {
          const stats = await db.get(
            `SELECT 
               COUNT(DISTINCT j.id) as jobs_found,
               SUM(CASE WHEN ms.match_score >= 90 THEN 1 ELSE 0 END) as high_matches,
               COUNT(a.id) as applications,
               SUM(CASE WHEN a.interview_scheduled = 1 THEN 1 ELSE 0 END) as interviews,
               SUM(CASE WHEN a.offer_received = 1 THEN 1 ELSE 0 END) as offers
             FROM jobs j
             LEFT JOIN match_scores ms ON j.id = ms.job_id AND ms.user_id = ?
             LEFT JOIN applications a ON j.id = a.job_id AND a.user_id = ?`,
            [user.id, user.id]
          );

          if (user.telegram_chat_id && stats) {
            await telegramService.sendDailySummary(user.telegram_chat_id, stats as any);
          }
        } catch (error) {
          logger.error('Error sending summary to user', error);
        }
      }

      logger.info('✨ Daily summaries sent');
    } catch (error) {
      logger.error('Daily summary job error', error);
    }
  });

  logger.info('✅ Daily summary scheduler started');
}
