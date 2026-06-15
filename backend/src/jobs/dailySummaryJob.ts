import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { getDatabase } from '../config/database.js';
import { telegramService } from '../services/telegramService.js';

export function startDailySummaryJob() {
  // Run every day at 9 PM
  cron.schedule('0 21 * * *', async () => {
    logger.info('📊 Sending daily summaries...');
    
    try {
      const sql = getDatabase();
      
      const users = await sql`
        SELECT u.id, u.email, ast.telegram_chat_id
        FROM users u
        LEFT JOIN automation_settings ast ON u.id = ast.user_id
        WHERE ast.telegram_enabled = true
      `;

      for (const user of users) {
        try {
          const stats = await sql`
            SELECT 
              COUNT(DISTINCT j.id) as jobs_found,
              COUNT(DISTINCT CASE WHEN ms.match_score >= 90 THEN j.id END) as high_matches,
              COUNT(a.id) as applications,
              COUNT(CASE WHEN a.interview_scheduled THEN 1 END) as interviews,
              COUNT(CASE WHEN a.offer_received THEN 1 END) as offers
            FROM jobs j
            LEFT JOIN match_scores ms ON j.id = ms.job_id AND ms.user_id = ${user.id}
            LEFT JOIN applications a ON j.id = a.job_id AND a.user_id = ${user.id}
          `;

          if (user.telegram_chat_id) {
            await telegramService.sendDailySummary(user.telegram_chat_id, stats[0]);
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
