import { Telegraf } from 'telegraf';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class TelegramService {
  private bot: Telegraf | null = null;

  constructor() {
    if (env.TELEGRAM_BOT_TOKEN) {
      this.bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);
    }
  }

  async sendNotification(chatId: string, message: string): Promise<boolean> {
    try {
      if (!this.bot) return false;
      await this.bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' });
      return true;
    } catch (error) {
      logger.error('Telegram notification error', error);
      return false;
    }
  }

  async sendJobAlert(chatId: string, job: any): Promise<boolean> {
    const message = `
🔔 <b>New Job Match Found!</b>

<b>${job.title}</b>
Company: ${job.company_name}
Location: ${job.location}
Match Score: ${job.match_score ?? job.matchScore ?? 0}%

<a href="${job.apply_url}">View Job</a>
    `;
    return this.sendNotification(chatId, message);
  }

  async sendDailySummary(chatId: string, stats: any): Promise<boolean> {
    const message = `
📊 <b>Daily Job Search Summary</b>

Jobs Found: ${stats.jobs_found ?? stats.jobsFound ?? 0}
High Matches (90%+): ${stats.high_matches ?? stats.highMatches ?? 0}
Applications: ${stats.applications ?? 0}
Interviews: ${stats.interviews ?? 0}
Offers: ${stats.offers ?? 0}

Keep up the great work! 🚀
    `;
    return this.sendNotification(chatId, message);
  }
}

export const telegramService = new TelegramService();
