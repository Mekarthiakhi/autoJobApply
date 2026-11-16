import { getDatabase } from '../config/database.js';

export interface Settings {
  id: string;
  user_id: string;
  target_roles: string;
  target_locations: string;
  min_salary: string | null;
  max_experience: string | null;
  preferred_platforms: string;
  auto_rank_threshold: number;
  updated_at: string;
}

export class SettingsRepository {
  async findByUserId(userId: string): Promise<Settings | null> {
    const db = await getDatabase();
    const row = await db.get(`SELECT * FROM settings WHERE user_id = ?`, [userId]);
    return (row || null) as Settings | null;
  }

  async upsert(userId: string, data: Partial<Omit<Settings, 'id' | 'user_id' | 'updated_at'>>): Promise<Settings> {
    const db = await getDatabase();

    const existing = await this.findByUserId(userId);

    if (existing) {
      const sets: string[] = [];
      const values: unknown[] = [];

      if (data.target_roles !== undefined) { sets.push('target_roles = ?'); values.push(typeof data.target_roles === 'string' ? data.target_roles : JSON.stringify(data.target_roles)); }
      if (data.target_locations !== undefined) { sets.push('target_locations = ?'); values.push(typeof data.target_locations === 'string' ? data.target_locations : JSON.stringify(data.target_locations)); }
      if (data.min_salary !== undefined) { sets.push('min_salary = ?'); values.push(data.min_salary); }
      if (data.max_experience !== undefined) { sets.push('max_experience = ?'); values.push(data.max_experience); }
      if (data.preferred_platforms !== undefined) { sets.push('preferred_platforms = ?'); values.push(typeof data.preferred_platforms === 'string' ? data.preferred_platforms : JSON.stringify(data.preferred_platforms)); }
      if (data.auto_rank_threshold !== undefined) { sets.push('auto_rank_threshold = ?'); values.push(data.auto_rank_threshold); }

      if (sets.length > 0) {
        sets.push('updated_at = CURRENT_TIMESTAMP');
        values.push(userId);
        await db.run(`UPDATE settings SET ${sets.join(', ')} WHERE user_id = ?`, values);
      }
    } else {
      await db.run(
        `INSERT INTO settings (user_id, target_roles, target_locations, min_salary, max_experience, preferred_platforms, auto_rank_threshold)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          data.target_roles ? (typeof data.target_roles === 'string' ? data.target_roles : JSON.stringify(data.target_roles)) : '[]',
          data.target_locations ? (typeof data.target_locations === 'string' ? data.target_locations : JSON.stringify(data.target_locations)) : '[]',
          data.min_salary || null,
          data.max_experience || null,
          data.preferred_platforms ? (typeof data.preferred_platforms === 'string' ? data.preferred_platforms : JSON.stringify(data.preferred_platforms)) : '["linkedin","indeed","naukri"]',
          data.auto_rank_threshold ?? 70,
        ]
      );
    }

    return (await this.findByUserId(userId))!;
  }
}
