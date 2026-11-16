import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';

export interface LifecycleSweepResult {
  staleCount: number;
  expiredCount: number;
}

export class JobLifecycleManager {
  /**
   * Sweeps the database to mark jobs as 'stale' or 'expired' based on their last_seen_at timestamp.
   * @param staleDays Days without being seen before marking as 'stale' (default: 14)
   * @param expireDays Days without being seen before marking as 'expired' (default: 30)
   */
  async sweepJobLifecycle(
    staleDays: number = 14,
    expireDays: number = 30
  ): Promise<LifecycleSweepResult> {
    const db = await getDatabase();
    logger.info(`🧹 Starting job lifecycle sweep (stale: ${staleDays}d, expire: ${expireDays}d)...`);

    // 1. Mark expired jobs (older than expireDays)
    const expireRes = await db.run(
      `UPDATE jobs
       SET status = 'expired', updated_at = CURRENT_TIMESTAMP
       WHERE last_seen_at < datetime('now', '-' || ? || ' days')
         AND status != 'expired'`,
      [expireDays]
    );
    const expiredCount = expireRes.changes || 0;

    // 2. Mark stale jobs (older than staleDays but not expired)
    const staleRes = await db.run(
      `UPDATE jobs
       SET status = 'stale', updated_at = CURRENT_TIMESTAMP
       WHERE last_seen_at < datetime('now', '-' || ? || ' days')
         AND status NOT IN ('stale', 'expired')`,
      [staleDays]
    );
    const staleCount = staleRes.changes || 0;

    logger.info(`✅ Job lifecycle sweep completed: ${staleCount} marked stale, ${expiredCount} marked expired.`);
    return { staleCount, expiredCount };
  }

  /**
   * Update last_seen_at timestamp and reactivate a job when rediscovered.
   */
  async touchJob(jobId: string): Promise<void> {
    const db = await getDatabase();
    await db.run(
      `UPDATE jobs
       SET last_seen_at = CURRENT_TIMESTAMP,
           status = CASE WHEN status = 'stale' THEN 'active' ELSE status END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [jobId]
    );
  }
}

export const jobLifecycleManager = new JobLifecycleManager();

