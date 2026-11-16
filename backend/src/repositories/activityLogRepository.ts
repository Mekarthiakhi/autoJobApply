import { getDatabase } from '../config/database.js';

export interface ActivityLog {
  id: string;
  user_id: string;
  job_id: string | null;
  action: string;
  details: string | null;
  screenshot_path: string | null;
  status: string;
  created_at: string;
}

export class ActivityLogRepository {
  async create(
    userId: string,
    action: string,
    options: { jobId?: string; details?: Record<string, unknown>; screenshotPath?: string; status?: string } = {}
  ): Promise<ActivityLog> {
    const db = await getDatabase();
    const detailsJson = options.details ? JSON.stringify(options.details) : null;

    await db.run(
      `INSERT INTO activity_logs (user_id, job_id, action, details, screenshot_path, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, options.jobId || null, action, detailsJson, options.screenshotPath || null, options.status || 'success']
    );

    const row = await db.get(
      `SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    return row as ActivityLog;
  }

  async findByUserId(
    userId: string,
    filters: { action?: string; status?: string; startDate?: string; endDate?: string; limit?: number; offset?: number } = {}
  ): Promise<ActivityLog[]> {
    const db = await getDatabase();
    const conditions = ['al.user_id = ?'];
    const values: unknown[] = [userId];

    if (filters.action) { conditions.push('al.action = ?'); values.push(filters.action); }
    if (filters.status) { conditions.push('al.status = ?'); values.push(filters.status); }
    if (filters.startDate) { conditions.push('al.created_at >= ?'); values.push(filters.startDate); }
    if (filters.endDate) { conditions.push('al.created_at <= ?'); values.push(filters.endDate); }

    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    values.push(limit, offset);

    return (await db.all(
      `SELECT al.*, j.title as job_title, j.company_name
       FROM activity_logs al
       LEFT JOIN jobs j ON al.job_id = j.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      values
    )) as any[];
  }

  async countByUserId(
    userId: string,
    filters: { action?: string; status?: string; startDate?: string; endDate?: string } = {}
  ): Promise<number> {
    const db = await getDatabase();
    const conditions = ['al.user_id = ?'];
    const values: unknown[] = [userId];

    if (filters.action) { conditions.push('al.action = ?'); values.push(filters.action); }
    if (filters.status) { conditions.push('al.status = ?'); values.push(filters.status); }
    if (filters.startDate) { conditions.push('al.created_at >= ?'); values.push(filters.startDate); }
    if (filters.endDate) { conditions.push('al.created_at <= ?'); values.push(filters.endDate); }

    const row = await db.get(
      `SELECT COUNT(*) as count
       FROM activity_logs al
       WHERE ${conditions.join(' AND ')}`,
      values
    );
    return row?.count || 0;
  }

  async getStats(userId: string): Promise<Record<string, number>> {
    const db = await getDatabase();
    const rows = await db.all(
      `SELECT action, COUNT(*) as count FROM activity_logs WHERE user_id = ? GROUP BY action`,
      [userId]
    );
    const stats: Record<string, number> = {};
    for (const row of rows as any[]) {
      stats[row.action] = row.count;
    }
    return stats;
  }

  async getRecentActivity(userId: string, limit: number = 10): Promise<ActivityLog[]> {
    const db = await getDatabase();
    return (await db.all(
      `SELECT al.*, j.title as job_title, j.company_name
       FROM activity_logs al
       LEFT JOIN jobs j ON al.job_id = j.id
       WHERE al.user_id = ?
       ORDER BY al.created_at DESC
       LIMIT ?`,
      [userId, limit]
    )) as any[];
  }

  async getAllForExport(userId: string): Promise<ActivityLog[]> {
    const db = await getDatabase();
    return (await db.all(
      `SELECT al.*, j.title as job_title, j.company_name
       FROM activity_logs al
       LEFT JOIN jobs j ON al.job_id = j.id
       WHERE al.user_id = ?
       ORDER BY al.created_at DESC`,
      [userId]
    )) as any[];
  }
}
