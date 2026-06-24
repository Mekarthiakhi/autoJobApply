import postgres from 'postgres';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let sql: ReturnType<typeof postgres> | null = null;
let dbAvailable = false;

export function getDatabase() {
  if (!sql) {
    sql = postgres({
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      username: env.DB_USER,
      password: env.DB_PASSWORD,
      connect_timeout: 5,
    });
  }
  return sql;
}

export function isDatabaseAvailable() {
  return dbAvailable;
}

export async function initializeDatabase() {
  const sql = getDatabase();
  
  try {
    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        preferred_locations TEXT[] DEFAULT '{}',
        employment_type VARCHAR(50) DEFAULT 'Full-Time',
        min_match_score INTEGER DEFAULT 80,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS resumes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        file_name VARCHAR(255),
        file_path VARCHAR(255),
        text_content TEXT,
        skills TEXT[],
        experience TEXT,
        education TEXT,
        keywords TEXT[],
        uploaded_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        salary VARCHAR(100),
        experience_level VARCHAR(50),
        required_skills TEXT[],
        job_description TEXT,
        apply_url VARCHAR(500),
        source VARCHAR(100),
        posted_date TIMESTAMP,
        external_id VARCHAR(500),
        status VARCHAR(50) DEFAULT 'new',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(source, external_id)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS match_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        match_score DECIMAL(5,2),
        missing_skills TEXT[],
        matching_skills TEXT[],
        strengths TEXT[],
        recommendation VARCHAR(50),
        analyzed_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, job_id)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending',
        applied_at TIMESTAMP DEFAULT NOW(),
        interview_scheduled BOOLEAN DEFAULT FALSE,
        interview_date TIMESTAMP,
        rejected BOOLEAN DEFAULT FALSE,
        offer_received BOOLEAN DEFAULT FALSE,
        notes TEXT,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, job_id)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS automation_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        auto_apply_enabled BOOLEAN DEFAULT FALSE,
        auto_apply_threshold DECIMAL(5,2) DEFAULT 90,
        approval_mode_enabled BOOLEAN DEFAULT TRUE,
        telegram_enabled BOOLEAN DEFAULT FALSE,
        telegram_chat_id VARCHAR(255),
        email_notifications BOOLEAN DEFAULT TRUE,
        job_search_frequency VARCHAR(50) DEFAULT 'hourly',
        platforms_enabled TEXT[] DEFAULT '{"linkedin","naukri","indeed"}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notification_type VARCHAR(100),
        title VARCHAR(255),
        message TEXT,
        related_job_id UUID REFERENCES jobs(id),
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
      CREATE INDEX IF NOT EXISTS idx_match_scores_user_id ON match_scores(user_id);
      CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    `;

    dbAvailable = true;
    logger.info('✅ Database initialized successfully');
  } catch (error: any) {
    dbAvailable = false;
    logger.warn('⚠️  Database not available — server starting in degraded mode');
    logger.warn(`   Reason: ${error.code || error.message}`);
    logger.warn('   To fix: Run "docker-compose up -d db" or install PostgreSQL locally');
  }
}

export async function closeDatabase() {
  if (sql) {
    await sql.end();
  }
}
