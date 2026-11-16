import { SettingsRepository, Settings } from '../repositories/settingsRepository.js';
import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';

const settingsRepository = new SettingsRepository();

export interface PlannerConfig {
  targetRoles: string[];
  targetLocations: string[];
  minSalary: string | null;
  maxExperience: string | null;
  preferredPlatforms: string[];
  autoRankThreshold: number;
}

export class PlannerAgent {
  /**
   * Reads user settings and builds a structured search plan
   */
  async buildPlan(userId: string): Promise<PlannerConfig> {
    logger.info('Building search plan', { agent: 'Planner', userId });

    let settings = await settingsRepository.findByUserId(userId);

    if (!settings) {
      // Create default settings
      settings = await settingsRepository.upsert(userId, {});
      logger.info('Created default settings for user', { agent: 'Planner', userId });
    }

    const config: PlannerConfig = {
      targetRoles: this.parseJsonArray(settings.target_roles),
      targetLocations: this.parseJsonArray(settings.target_locations),
      minSalary: settings.min_salary,
      maxExperience: settings.max_experience,
      preferredPlatforms: this.parseJsonArray(settings.preferred_platforms),
      autoRankThreshold: settings.auto_rank_threshold,
    };

    // Provide sensible defaults if user hasn't configured anything
    if (config.targetRoles.length === 0) {
      config.targetRoles = ['Software Developer', 'Frontend Developer', 'Full Stack Developer'];
      logger.warn('No target roles configured, using defaults', { agent: 'Planner', userId });
    }

    if (config.preferredPlatforms.length === 0) {
      config.preferredPlatforms = ['linkedin', 'indeed', 'naukri'];
    }

    logger.info('Plan built successfully', { agent: 'Planner', userId, roles: config.targetRoles.length, platforms: config.preferredPlatforms.length });
    return config;
  }

  /**
   * Check if a job has already been applied to by this user
   */
  async isDuplicate(userId: string, jobId: string): Promise<boolean> {
    const db = await getDatabase();
    const row = await db.get(
      `SELECT id FROM applications WHERE user_id = ? AND job_id = ?`,
      [userId, jobId]
    );
    return !!row;
  }

  /**
   * Check for duplicates across a batch of job IDs
   */
  async filterDuplicates(userId: string, jobIds: string[]): Promise<string[]> {
    if (jobIds.length === 0) return [];

    const db = await getDatabase();
    const placeholders = jobIds.map(() => '?').join(',');
    const applied = await db.all(
      `SELECT job_id FROM applications WHERE user_id = ? AND job_id IN (${placeholders})`,
      [userId, ...jobIds]
    );

    const appliedSet = new Set((applied as any[]).map(r => r.job_id));
    return jobIds.filter(id => !appliedSet.has(id));
  }

  private parseJsonArray(value: string | null | undefined): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

export const plannerAgent = new PlannerAgent();
