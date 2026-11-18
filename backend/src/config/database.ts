import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (!db) {
    const candidatePaths = [
      path.resolve(__dirname, '../../jobs.db'),
      path.resolve(process.cwd(), 'backend', 'jobs.db'),
      path.resolve(process.cwd(), 'jobs.db'),
    ].filter(Boolean) as string[];

    const dbPath = process.env.DB_PATH || candidatePaths.find(p => fs.existsSync(p)) || path.resolve(process.cwd(), 'jobs.db');
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON;');
  }
  return db;
}

export function isDatabaseAvailable(): boolean {
  return db !== null;
}

export async function initializeDatabase() {
  const sql = await getDatabase();
  
  // Create tables
  await sql.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255),
      role VARCHAR(50) DEFAULT 'user',
      preferred_locations TEXT DEFAULT '["Remote"]',
      employment_type VARCHAR(50) DEFAULT 'Full-Time',
      min_match_score INTEGER DEFAULT 55,
      is_verified INTEGER DEFAULT 0,
      verification_token VARCHAR(255),
      reset_token VARCHAR(255),
      reset_token_expires DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await sql.exec(`
    CREATE TABLE IF NOT EXISTS resumes (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      file_name VARCHAR(255),
      file_path VARCHAR(255),
      text_content TEXT,
      skills TEXT DEFAULT '[]',
      experience TEXT,
      education TEXT,
      keywords TEXT DEFAULT '[]',
      builder_data TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await sql.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      title VARCHAR(255) NOT NULL,
      company_name VARCHAR(255) NOT NULL,
      location VARCHAR(255),
      salary VARCHAR(100),
      experience_level VARCHAR(50),
      required_skills TEXT DEFAULT '[]',
      job_description TEXT,
      apply_url VARCHAR(500),
      source VARCHAR(100),
      posted_date DATETIME,
      external_id VARCHAR(500),
      status VARCHAR(50) DEFAULT 'new',
      employment_type VARCHAR(50) DEFAULT 'Full-Time',
      last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source, external_id)
    );
  `);

  // Ensure migration safety for existing databases
  const jobColumns = await sql.all('PRAGMA table_info(jobs)');
  const jobColNames = jobColumns.map((c: any) => c.name);
  if (!jobColNames.includes('employment_type')) {
    await sql.exec(`ALTER TABLE jobs ADD COLUMN employment_type VARCHAR(50) DEFAULT 'Full-Time';`);
  }
  if (!jobColNames.includes('last_seen_at')) {
    await sql.exec(`ALTER TABLE jobs ADD COLUMN last_seen_at DATETIME;`);
    await sql.exec(`UPDATE jobs SET last_seen_at = created_at WHERE last_seen_at IS NULL;`);
  }

  await sql.exec(`
    CREATE TABLE IF NOT EXISTS match_scores (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      match_score REAL,
      missing_skills TEXT DEFAULT '[]',
      matching_skills TEXT DEFAULT '[]',
      strengths TEXT DEFAULT '[]',
      recommendation VARCHAR(50),
      analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, job_id)
    );
  `);

  await sql.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      status VARCHAR(50) DEFAULT 'pending',
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      interview_scheduled INTEGER DEFAULT 0,
      interview_date DATETIME,
      rejected INTEGER DEFAULT 0,
      offer_received INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, job_id)
    );
  `);

  await sql.exec(`
    CREATE TABLE IF NOT EXISTS automation_settings (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      auto_apply_enabled INTEGER DEFAULT 1,
      auto_apply_threshold REAL DEFAULT 55,
      approval_mode_enabled INTEGER DEFAULT 1,
      telegram_enabled INTEGER DEFAULT 0,
      telegram_chat_id VARCHAR(255),
      email_notifications INTEGER DEFAULT 1,
      job_search_frequency VARCHAR(50) DEFAULT 'hourly',
      platforms_enabled TEXT DEFAULT '["linkedin","naukri","indeed"]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await sql.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      notification_type VARCHAR(100),
      title VARCHAR(255),
      message TEXT,
      related_job_id TEXT REFERENCES jobs(id),
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await sql.exec(`
    CREATE TABLE IF NOT EXISTS saved_searches (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      keyword VARCHAR(255),
      location VARCHAR(255),
      experience VARCHAR(100),
      salary VARCHAR(100),
      remote INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // --- New tables for AI-assisted job application platform ---

  await sql.exec(`
    CREATE TABLE IF NOT EXISTS resume_versions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label VARCHAR(255) NOT NULL,
      file_name VARCHAR(255),
      text_content TEXT,
      skills TEXT DEFAULT '[]',
      structured_data TEXT,
      parent_version_id TEXT,
      target_job_id TEXT,
      ats_score REAL,
      version_number INTEGER DEFAULT 1,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure migration safety for existing resume_versions tables
  const resumeVersionColumns = await sql.all('PRAGMA table_info(resume_versions)');
  const rvColNames = resumeVersionColumns.map((c: any) => c.name);
  if (!rvColNames.includes('structured_data')) {
    await sql.exec(`ALTER TABLE resume_versions ADD COLUMN structured_data TEXT;`);
  }
  if (!rvColNames.includes('parent_version_id')) {
    await sql.exec(`ALTER TABLE resume_versions ADD COLUMN parent_version_id TEXT;`);
  }
  if (!rvColNames.includes('target_job_id')) {
    await sql.exec(`ALTER TABLE resume_versions ADD COLUMN target_job_id TEXT;`);
  }
  if (!rvColNames.includes('ats_score')) {
    await sql.exec(`ALTER TABLE resume_versions ADD COLUMN ats_score REAL;`);
  }
  if (!rvColNames.includes('version_number')) {
    await sql.exec(`ALTER TABLE resume_versions ADD COLUMN version_number INTEGER DEFAULT 1;`);
  }

  await sql.exec(`
    CREATE TABLE IF NOT EXISTS cover_letters (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
      resume_version_id TEXT REFERENCES resume_versions(id) ON DELETE SET NULL,
      content TEXT NOT NULL,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await sql.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      details TEXT,
      screenshot_path VARCHAR(500),
      status VARCHAR(50) DEFAULT 'success',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await sql.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      target_roles TEXT DEFAULT '[]',
      target_locations TEXT DEFAULT '[]',
      min_salary VARCHAR(100),
      max_experience VARCHAR(50),
      preferred_platforms TEXT DEFAULT '["linkedin","indeed","naukri"]',
      auto_rank_threshold INTEGER DEFAULT 70,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safely add new columns to applications table (SQLite lacks IF NOT EXISTS for ALTER TABLE)
  const alterStatements = [
    `ALTER TABLE applications ADD COLUMN review_status VARCHAR(50) DEFAULT 'pending'`,
    `ALTER TABLE applications ADD COLUMN resume_version_id TEXT`,
    `ALTER TABLE applications ADD COLUMN cover_letter_id TEXT`,
    `ALTER TABLE applications ADD COLUMN match_score REAL`,
    `ALTER TABLE applications ADD COLUMN screenshot_path VARCHAR(500)`,
    `ALTER TABLE applications ADD COLUMN warnings TEXT DEFAULT '[]'`,
    `ALTER TABLE applications ADD COLUMN scraped_questions TEXT DEFAULT '[]'`,
    `ALTER TABLE applications ADD COLUMN application_answers TEXT DEFAULT '[]'`,
    `ALTER TABLE applications ADD COLUMN missing_fields TEXT DEFAULT '[]'`,
    `ALTER TABLE applications ADD COLUMN uncertain_fields TEXT DEFAULT '[]'`,
    `ALTER TABLE applications ADD COLUMN candidate_verified INTEGER DEFAULT 0`,
    `ALTER TABLE applications ADD COLUMN draft_version INTEGER DEFAULT 1`,
    `ALTER TABLE applications ADD COLUMN approved_draft_hash TEXT`,
    `ALTER TABLE applications ADD COLUMN approval_expires_at DATETIME`,
    `ALTER TABLE applications ADD COLUMN submission_attempt_count INTEGER DEFAULT 0`,
    `ALTER TABLE applications ADD COLUMN last_submission_error TEXT`,
    `ALTER TABLE applications ADD COLUMN stage_status VARCHAR(50) DEFAULT 'READY_FOR_REVIEW'`,
    `ALTER TABLE applications ADD COLUMN created_at DATETIME`,
    `ALTER TABLE applications ADD COLUMN external_status VARCHAR(50) DEFAULT 'AI_PREPARED'`,
    `ALTER TABLE applications ADD COLUMN submission_proof TEXT`,
    `ALTER TABLE applications ADD COLUMN verified_at DATETIME`,
    `ALTER TABLE automation_settings ADD COLUMN whatsapp_enabled INTEGER DEFAULT 0`,
    `ALTER TABLE automation_settings ADD COLUMN whatsapp_phone VARCHAR(50)`,
    `ALTER TABLE automation_settings ADD COLUMN whatsapp_api_key VARCHAR(255)`,
  ];
  for (const stmt of alterStatements) {
    try { await sql.exec(stmt); } catch { /* column already exists */ }
  }

  // Backfill created_at if null
  try {
    await sql.exec(`UPDATE applications SET created_at = COALESCE(applied_at, CURRENT_TIMESTAMP) WHERE created_at IS NULL`);
  } catch { /* ignore */ }

  // Indexes — existing
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id)`);
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source)`);
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_match_scores_user_id ON match_scores(user_id)`);
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id)`);
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_applications_stage_status ON applications(stage_status)`);
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`);

  // Indexes — new tables
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_resume_versions_user_id ON resume_versions(user_id)`);
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_resume_versions_parent ON resume_versions(parent_version_id)`);
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_resume_versions_target_job ON resume_versions(target_job_id)`);
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_applications_resume_version ON applications(resume_version_id)`);
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_cover_letters_user_id ON cover_letters(user_id)`);
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_cover_letters_job_id ON cover_letters(job_id)`);
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id)`);
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)`);
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at)`);
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id)`);
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_applications_review_status ON applications(review_status)`);

  // Dashboard & Analytics Query Optimization Indexes
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_name)`);
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at)`);
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_applications_user_status ON applications(user_id, status)`);
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications(applied_at)`);
  await sql.exec(`CREATE INDEX IF NOT EXISTS idx_activity_logs_user_status ON activity_logs(user_id, status)`);

  console.log('✅ SQLite Database initialized successfully');
}

export async function closeDatabase() {
  if (db) {
    await db.close();
    db = null;
  }
}
