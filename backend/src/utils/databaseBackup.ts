import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { getDatabase } from '../config/database.js';
import { logger } from './logger.js';

export interface BackupResult {
  success: boolean;
  backupPath: string;
  sizeBytes: number;
  timestamp: string;
  error?: string;
}

export interface BackupEntry {
  filename: string;
  path: string;
  sizeBytes: number;
  createdAt: string;
}

export class DatabaseBackupManager {
  private backupDir: string;

  constructor(customBackupDir?: string) {
    this.backupDir = customBackupDir || path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Executes atomic SQLite VACUUM INTO online backup
   */
  async createBackup(): Promise<BackupResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `jobs-backup-${timestamp}.db`;
    const targetPath = path.join(this.backupDir, backupFileName);

    try {
      const db = await getDatabase();
      logger.info(`📦 [DatabaseBackup] Creating atomic backup to ${targetPath}...`);

      // SQLite VACUUM INTO creates an atomic transaction-safe snapshot
      await db.run(`VACUUM INTO ?`, [targetPath]);

      // Verify file was written
      const stats = fs.statSync(targetPath);
      logger.info(`✅ [DatabaseBackup] Backup created successfully (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

      // Verify integrity
      const isHealthy = await this.verifyBackupIntegrity(targetPath);
      if (!isHealthy.ok) {
        throw new Error(`Backup integrity check failed: ${isHealthy.message}`);
      }

      return {
        success: true,
        backupPath: targetPath,
        sizeBytes: stats.size,
        timestamp,
      };
    } catch (error: any) {
      logger.error('Failed to create database backup', error);
      return {
        success: false,
        backupPath: targetPath,
        sizeBytes: 0,
        timestamp,
        error: error.message,
      };
    }
  }

  /**
   * Verifies the SQLite integrity check on a backup database file
   */
  async verifyBackupIntegrity(backupFilePath: string): Promise<{ ok: boolean; message: string }> {
    if (!fs.existsSync(backupFilePath)) {
      return { ok: false, message: `Backup file does not exist: ${backupFilePath}` };
    }

    let backupDb: any = null;
    try {
      backupDb = await open({
        filename: backupFilePath,
        driver: sqlite3.Database,
      });

      const row = await backupDb.get('PRAGMA integrity_check');
      const result = row ? Object.values(row)[0] : 'unknown';

      if (result === 'ok') {
        return { ok: true, message: 'PRAGMA integrity_check passed' };
      } else {
        return { ok: false, message: `Integrity issue: ${String(result)}` };
      }
    } catch (err: any) {
      return { ok: false, message: `Failed to open or inspect backup: ${err.message}` };
    } finally {
      if (backupDb) {
        await backupDb.close();
      }
    }
  }

  /**
   * Lists all existing backup files sorted by creation date descending
   */
  async listBackups(): Promise<BackupEntry[]> {
    if (!fs.existsSync(this.backupDir)) return [];

    const files = fs.readdirSync(this.backupDir);
    const backups: BackupEntry[] = [];

    for (const file of files) {
      if (file.endsWith('.db')) {
        const fullPath = path.join(this.backupDir, file);
        try {
          const stat = fs.statSync(fullPath);
          backups.push({
            filename: file,
            path: fullPath,
            sizeBytes: stat.size,
            createdAt: stat.birthtime.toISOString(),
          });
        } catch { /* skip unreadable */ }
      }
    }

    return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export const databaseBackupManager = new DatabaseBackupManager();

