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
      autoRankThreshold: settings.auto_rank_threshold && settings.auto_rank_threshold !== 70 ? settings.auto_rank_threshold : 55,
    };

    // Dynamically derive target roles & locations from uploaded resume & user profile if not configured
    const db = await getDatabase();
    if (config.targetRoles.length === 0) {
      const resumeRow = await db.get<{ text_content?: string; skills?: string; builder_data?: string }>(
        `SELECT text_content, skills, builder_data FROM resumes WHERE user_id = ? LIMIT 1`,
        [userId]
      );
      const inferredRoles: string[] = [];
      if (resumeRow?.builder_data) {
        try {
          const parsed = JSON.parse(resumeRow.builder_data);
          if (parsed?.headline) inferredRoles.push(String(parsed.headline).split(/[–—|-]/)[0].trim());
          if (Array.isArray(parsed?.experience) && parsed.experience[0]?.role) {
            inferredRoles.push(String(parsed.experience[0].role).trim());
          }
        } catch {}
      }
      const resumeText = `${resumeRow?.skills || ''} ${resumeRow?.text_content || ''}`.toLowerCase();
      if (resumeText.includes('react')) inferredRoles.push('React Developer');
      if (resumeText.includes('frontend') || resumeText.includes('front-end')) inferredRoles.push('Frontend Developer');
      if (resumeText.includes('typescript') || resumeText.includes('javascript')) inferredRoles.push('JavaScript Developer');
      if (resumeText.includes('node')) inferredRoles.push('Full Stack Developer');

      const uniqueRoles = Array.from(new Set(inferredRoles.filter((r) => r && r.length >= 3))).slice(0, 3);
      config.targetRoles = uniqueRoles.length > 0
        ? uniqueRoles
        : ['React Developer', 'Frontend Developer', 'Full Stack Developer'];
      logger.info('Derived target roles from candidate resume', { agent: 'Planner', userId, targetRoles: config.targetRoles });
    }

    if (config.targetLocations.length === 0) {
      const userRow = await db.get<{ preferred_locations?: string }>(
        `SELECT preferred_locations FROM users WHERE id = ?`,
        [userId]
      );
      const userLocs = this.parseJsonArray(userRow?.preferred_locations);
      config.targetLocations = userLocs.length > 0 ? userLocs : ['Remote'];
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
