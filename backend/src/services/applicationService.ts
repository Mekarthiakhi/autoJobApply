import { ApplicationRepository } from '../repositories/applicationRepository.js';
import { MatchScoreRepository } from '../repositories/matchScoreRepository.js';
import { logger } from '../utils/logger.js';

const applicationRepository = new ApplicationRepository();
const matchScoreRepository = new MatchScoreRepository();

export class ApplicationService {
  async applyToJob(userId: string, jobId: string) {
    try {
      const application = await applicationRepository.create(userId, jobId);
      logger.info(`✅ Application submitted for job ${jobId}`);
      return application;
    } catch (error) {
      logger.error('Application submission error:', error);
      throw error;
    }
  }

  async getTopMatches(userId: string, limit: number = 20) {
    try {
      const matches = await matchScoreRepository.findTopMatches(userId, limit);
      return matches;
    } catch (error) {
      logger.error('Failed to fetch top matches:', error);
      return [];
    }
  }
}

export const applicationService = new ApplicationService();
