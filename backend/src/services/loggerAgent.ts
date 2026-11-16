import { ActivityLogRepository } from '../repositories/activityLogRepository.js';
import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import fs from 'fs';
import path from 'path';

const activityLogRepository = new ActivityLogRepository();

export class LoggerAgent {
  /**
   * Log an activity for a user
   */
  async log(
    userId: string,
    action: string,
    options: {
      jobId?: string;
      details?: Record<string, unknown>;
      screenshotPath?: string;
      status?: 'success' | 'failed' | 'warning';
    } = {}
  ) {
    try {
      await activityLogRepository.create(userId, action, options);
      logger.info('Activity logged', { agent: 'Logger', userId, action, status: options.status || 'success' });
    } catch (error) {
      logger.error('Failed to log activity', { agent: 'Logger', userId, action, error });
    }
  }

  /**
   * Export applications to CSV format
   */
  async exportApplicationsCsv(userId: string): Promise<string> {
    const db = await getDatabase();
    const rows = await db.all(
      `SELECT
        a.id, j.title as job_title, j.company_name, j.location, j.salary,
        a.status, a.review_status, a.match_score, a.applied_at, a.updated_at
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.user_id = ?
       ORDER BY a.applied_at DESC`,
      [userId]
    ) as any[];

    const headers = ['ID', 'Job Title', 'Company', 'Location', 'Salary', 'Status', 'Review Status', 'Match Score', 'Applied At', 'Updated At'];
    const csvLines = [headers.join(',')];

    for (const row of rows) {
      const values = [
        row.id,
        this.escapeCsv(row.job_title),
        this.escapeCsv(row.company_name),
        this.escapeCsv(row.location || ''),
        this.escapeCsv(row.salary || ''),
        row.status,
        row.review_status || '',
        row.match_score ?? '',
        row.applied_at,
        row.updated_at,
      ];
      csvLines.push(values.join(','));
    }

    return csvLines.join('\n');
  }

  /**
   * Export activity logs to CSV format
   */
  async exportActivityLogsCsv(userId: string): Promise<string> {
    const logs = await activityLogRepository.getAllForExport(userId);

    const headers = ['ID', 'Action', 'Job Title', 'Company', 'Status', 'Details', 'Created At'];
    const csvLines = [headers.join(',')];

    for (const log of logs as any[]) {
      const values = [
        log.id,
        log.action,
        this.escapeCsv(log.job_title || ''),
        this.escapeCsv(log.company_name || ''),
        log.status,
        this.escapeCsv(log.details || ''),
        log.created_at,
      ];
      csvLines.push(values.join(','));
    }

    return csvLines.join('\n');
  }

  /**
   * Export applications to a simple XLSX-compatible tab-separated format.
   * For full Excel support, install the 'xlsx' package.
   */
  async exportApplicationsXlsx(userId: string): Promise<Buffer> {
    // Using TSV as a lightweight Excel-compatible format
    // that doesn't require external dependencies
    const db = await getDatabase();
    const rows = await db.all(
      `SELECT
        a.id, j.title as job_title, j.company_name, j.location, j.salary,
        a.status, a.review_status, a.match_score, a.applied_at, a.updated_at
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.user_id = ?
       ORDER BY a.applied_at DESC`,
      [userId]
    ) as any[];

    const headers = ['ID', 'Job Title', 'Company', 'Location', 'Salary', 'Status', 'Review Status', 'Match Score', 'Applied At', 'Updated At'];
    const tsvLines = [headers.join('\t')];

    for (const row of rows) {
      const values = [
        row.id,
        row.job_title || '',
        row.company_name || '',
        row.location || '',
        row.salary || '',
        row.status,
        row.review_status || '',
        row.match_score ?? '',
        row.applied_at,
        row.updated_at,
      ];
      tsvLines.push(values.join('\t'));
    }

    return Buffer.from(tsvLines.join('\n'), 'utf-8');
  }

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

export const loggerAgent = new LoggerAgent();
