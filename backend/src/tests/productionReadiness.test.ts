import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { initializeDatabase, getDatabase } from '../config/database.js';
import { generateToken, verifyToken, decodeToken } from '../utils/jwt.js';
import { hashPassword, comparePassword } from '../utils/encryption.js';
import { validateEnvironmentSecurity, env } from '../config/env.js';
import { databaseBackupManager } from '../utils/databaseBackup.js';
import { logger } from '../utils/logger.js';
import { executeDiscoveryRun } from '../jobs/jobDiscoveryJob.js';
import { jobDiscoveryService } from '../services/jobDiscoveryService.js';

describe('Phase 12: Production Readiness and Security Audit Tests', () => {
  before(async () => {
    await initializeDatabase();
  });

  describe('1. Authentication, Password Hashing and JWT Security', () => {
    it('generates, verifies, and decodes signed JWT tokens securely', () => {
      const payload = { userId: 'user_sec_123', email: 'sec@example.com' };
      const token = generateToken(payload);

      assert.ok(token && typeof token === 'string', 'Token must be non-empty string');

      // Verify token
      const verified = verifyToken(token);
      assert.strictEqual(verified.userId, payload.userId);
      assert.strictEqual(verified.email, payload.email);

      // Decode token
      const decoded = decodeToken(token);
      assert.strictEqual(decoded?.userId, payload.userId);
    });

    it('rejects tampered and invalid JWT tokens', () => {
      const payload = { userId: 'user_sec_123', email: 'sec@example.com' };
      const token = generateToken(payload);
      const tampered = token.slice(0, -6) + 'abcdef';

      assert.throws(() => {
        verifyToken(tampered);
      }, /invalid signature|jwt malformed/i);
    });

    it('hashes passwords with bcrypt and verifies matches without storing plaintext', async () => {
      const rawPassword = 'SuperStrongPassword!2026';
      const hash = await hashPassword(rawPassword);

      assert.notStrictEqual(hash, rawPassword, 'Hash must not equal plaintext password');
      assert.ok(hash.startsWith('$2'), 'Hash must follow standard bcrypt format');

      const matches = await comparePassword(rawPassword, hash);
      assert.strictEqual(matches, true, 'Correct password must compare true');

      const wrongMatch = await comparePassword('WrongPassword123', hash);
      assert.strictEqual(wrongMatch, false, 'Wrong password must compare false');
    });
  });

  describe('2. Sensitive Data Protection & Redaction in Logging', () => {
    it('automatically redacts sensitive keys (passwords, tokens, secrets) in logs', () => {
      let interceptedOutput = '';
      const originalLog = console.log;
      console.log = (msg: string) => { interceptedOutput = msg; };

      try {
        logger.info('User authentication event', {
          userId: 'user_123',
          password: 'SecretPassword123',
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          jwt_secret: 'confidential_key',
          email: 'user@example.com'
        });

        assert.ok(interceptedOutput.includes('"password":"[REDACTED]"'), 'Password must be redacted');
        assert.ok(interceptedOutput.includes('"token":"[REDACTED]"'), 'Token must be redacted');
        assert.ok(interceptedOutput.includes('"jwt_secret":"[REDACTED]"'), 'JWT secret must be redacted');
        assert.ok(interceptedOutput.includes('"email":"user@example.com"'), 'Non-sensitive fields must remain readable');
      } finally {
        console.log = originalLog;
      }
    });

    it('validates environment security configuration', () => {
      const envCheck = validateEnvironmentSecurity();
      assert.ok(typeof envCheck.isSecure === 'boolean');
      assert.ok(Array.isArray(envCheck.issues));
    });

    it('enforces strict JWT and CORS security when NODE_ENV is staging', () => {
      const origEnv = env.NODE_ENV;
      const origSecret = env.JWT_SECRET;
      const origCors = env.CORS_ORIGIN;

      try {
        // Test staging with weak JWT secret and wildcard CORS
        (env as any).NODE_ENV = 'staging';
        (env as any).JWT_SECRET = 'short';
        (env as any).CORS_ORIGIN = '*';

        const stagingCheck = validateEnvironmentSecurity();
        assert.strictEqual(stagingCheck.isSecure, false);
        assert.ok(stagingCheck.issues.some(i => i.includes('JWT_SECRET must be at least 32 characters long in staging')));
        assert.ok(stagingCheck.issues.some(i => i.includes('CORS_ORIGIN cannot be unset, wildcard (*), or contain wildcard in staging')));

        // Test staging with strong JWT secret and explicit origins
        (env as any).JWT_SECRET = 'a-very-strong-and-secure-random-staging-secret-key-32chars!';
        (env as any).CORS_ORIGIN = 'https://staging.autojobapply.com';

        const secureStagingCheck = validateEnvironmentSecurity();
        assert.strictEqual(secureStagingCheck.isSecure, true);
        assert.strictEqual(secureStagingCheck.issues.length, 0);
      } finally {
        (env as any).NODE_ENV = origEnv;
        (env as any).JWT_SECRET = origSecret;
        (env as any).CORS_ORIGIN = origCors;
      }
    });
  });

  describe('3. Database Backup, Recovery and Integrity Checks', () => {
    it('executes atomic SQLite backup and passes PRAGMA integrity_check', async () => {
      const result = await databaseBackupManager.createBackup();

      assert.strictEqual(result.success, true, `Backup should succeed: ${result.error}`);
      assert.ok(fs.existsSync(result.backupPath), 'Backup file must exist on disk');
      assert.ok(result.sizeBytes > 0, 'Backup size must be greater than zero');

      // Verify integrity check directly
      const integrity = await databaseBackupManager.verifyBackupIntegrity(result.backupPath);
      assert.strictEqual(integrity.ok, true, `Backup integrity check must pass: ${integrity.message}`);

      // Cleanup test backup file
      try { fs.unlinkSync(result.backupPath); } catch { /* ignore */ }
    });

    it('lists existing database backups with metadata', async () => {
      const backups = await databaseBackupManager.listBackups();
      assert.ok(Array.isArray(backups), 'Must return an array of backup entries');
    });
  });

  describe('4. Scheduled Job Fault-Tolerance and Idempotency', () => {
    it('isolates scheduled discovery errors and avoids uncaught crashes', async () => {
      // Test fault tolerance and error isolation without live network scraping
      const originalDiscover = jobDiscoveryService.discoverJobs;
      try {
        jobDiscoveryService.discoverJobs = async () => { throw new Error('Simulated platform network timeout'); };
        const runResult = await executeDiscoveryRun();
        assert.ok(runResult !== null && typeof runResult === 'object');
        assert.ok(typeof runResult.newJobsFound === 'number');
        assert.ok(typeof runResult.staleCount === 'number');
        assert.ok(typeof runResult.expiredCount === 'number');
      } finally {
        jobDiscoveryService.discoverJobs = originalDiscover;
      }
    });

    it('enforces idempotency on applications and match scores via unique constraints', async () => {
      const db = await getDatabase();
      const testEmail = `idempotency_${Date.now()}@example.com`;
      await db.run(
        `INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)`,
        [testEmail, 'hash', 'Idempotency User']
      );
      const user = await db.get(`SELECT id FROM users WHERE email = ?`, [testEmail]);

      const testJobExternalId = `ext_idem_${Date.now()}`;
      await db.run(
        `INSERT INTO jobs (title, company_name, source, external_id) VALUES (?, ?, ?, ?)`,
        ['Idempotency Role', 'Idem Corp', 'linkedin', testJobExternalId]
      );
      const job = await db.get(`SELECT id FROM jobs WHERE external_id = ?`, [testJobExternalId]);

      // First application insert
      await db.run(
        `INSERT INTO applications (user_id, job_id, stage_status) VALUES (?, ?, 'DRAFTING')`,
        [user.id, job.id]
      );

      // Duplicate application insert must be rejected by UNIQUE(user_id, job_id)
      await assert.rejects(
        async () => {
          await db.run(
            `INSERT INTO applications (user_id, job_id, stage_status) VALUES (?, ?, 'DRAFTING')`,
            [user.id, job.id]
          );
        },
        /UNIQUE constraint failed/i
      );
    });
  });

  describe('5. Health Check & Deployment Readiness', () => {
    it('confirms database connectivity and operational status via SELECT 1', async () => {
      const db = await getDatabase();
      const row = await db.get('SELECT 1 as alive');
      assert.strictEqual(row?.alive, 1, 'Database must respond to health probe');
    });

    it('confirms required production directories exist or are created', () => {
      const backupsDir = path.resolve(process.cwd(), 'backups');
      assert.ok(fs.existsSync(backupsDir), 'backups directory must exist');
    });
  });
});
