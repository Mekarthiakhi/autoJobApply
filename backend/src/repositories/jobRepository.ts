import { getDatabase } from '../config/database.js';
import { NormalizedJob, JobFilterCriteria } from '../discovery/types.js';

export interface Job {
  id: string;
  title: string;
  company_name: string;
  location: string;
  salary: string;
  experience_level: string;
  employment_type?: string;
  required_skills: string[];
  job_description: string;
  apply_url: string;
  source: string;
  posted_date: Date | string;
  external_id: string;
  status: string;
  last_seen_at?: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
}

export class JobRepository {
  async create(jobData: Omit<Job, 'id' | 'created_at' | 'updated_at'>): Promise<Job> {
    const db = await getDatabase();

    const safeData: any = { ...jobData };
    if (Array.isArray(safeData.required_skills)) {
      safeData.required_skills = JSON.stringify(safeData.required_skills);
    }

    const keys = Object.keys(safeData);
    const values = keys.map(k => safeData[k]);
    const placeholders = keys.map(() => '?').join(', ');

    await db.run(
      `INSERT INTO jobs (${keys.join(', ')}) VALUES (${placeholders})`,
      values
    );

    return this.findByExternalId(safeData.source, safeData.external_id) as Promise<Job>;
  }

  /**
   * Idempotent upsert of a NormalizedJob.
   * Updates last_seen_at and reactivates stale jobs without creating duplicate entries.
   */
  async upsertNormalizedJob(job: NormalizedJob): Promise<Job> {
    const db = await getDatabase();
    const skillsJson = JSON.stringify(job.requiredSkills || []);
    const salaryStr = job.salary.raw || 'Not specified';

    await db.run(
      `INSERT INTO jobs (
        title, company_name, location, salary, experience_level,
        employment_type, required_skills, job_description, apply_url,
        source, posted_date, external_id, status, last_seen_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(source, external_id) DO UPDATE SET
        last_seen_at = CURRENT_TIMESTAMP,
        status = CASE WHEN status = 'stale' THEN 'active' ELSE status END,
        salary = CASE WHEN excluded.salary != 'Not specified' THEN excluded.salary ELSE jobs.salary END,
        updated_at = CURRENT_TIMESTAMP`,
      [
        job.title,
        job.companyName,
        job.location,
        salaryStr,
        job.experienceLevel,
        job.employmentType,
        skillsJson,
        job.jobDescription,
        job.applyUrl,
        job.source,
        job.postedDate,
        job.externalId,
        job.status,
      ]
    );

    const found = await this.findByExternalId(job.source, job.externalId);
    return found!;
  }

  async findByExternalId(source: string, externalId: string): Promise<Job | null> {
    const db = await getDatabase();
    const result = await db.get(
      `SELECT * FROM jobs WHERE source = ? AND external_id = ?`,
      [source, externalId]
    );
    return (result || null) as any;
  }

  async findById(id: string): Promise<Job | null> {
    const db = await getDatabase();
    const result = await db.get(`SELECT * FROM jobs WHERE id = ?`, [id]);
    return (result || null) as any;
  }

  async findRecent(limit: number = 50): Promise<Job[]> {
    const db = await getDatabase();
    const result = await db.all(
      `SELECT * FROM jobs WHERE status != 'expired' ORDER BY posted_date DESC, created_at DESC LIMIT ?`,
      [limit]
    );
    return result as any;
  }

  async findByKeywords(keywords: string[], limit: number = 50): Promise<Job[]> {
    const db = await getDatabase();

    if (!keywords || keywords.length === 0) {
      return this.findRecent(limit);
    }

    const likeClauses = keywords.map(() => `job_description LIKE ?`).join(' OR ');
    const values = keywords.map(kw => `%${kw}%`);
    values.push(limit as any);

    const result = await db.all(
      `SELECT * FROM jobs WHERE (${likeClauses}) AND status != 'expired' ORDER BY posted_date DESC LIMIT ?`,
      values
    );
    return result as any;
  }

  /**
   * Search jobs with rich multi-field filters.
   */
  async findWithFilters(filters: JobFilterCriteria, userId?: string): Promise<{ jobs: any[]; total: number }> {
    const db = await getDatabase();
    const conditions: string[] = [];
    const params: any[] = [];

    // Filter by keyword in title, company or description
    if (filters.keyword && filters.keyword.trim()) {
      conditions.push(`(j.title LIKE ? OR j.company_name LIKE ? OR j.job_description LIKE ?)`);
      const val = `%${filters.keyword.trim()}%`;
      params.push(val, val, val);
    }

    // Filter by location
    if (filters.location && filters.location.trim()) {
      conditions.push(`j.location LIKE ?`);
      params.push(`%${filters.location.trim()}%`);
    }

    // Filter remote only
    if (filters.remoteOnly) {
      conditions.push(`(j.location LIKE '%remote%' OR j.job_description LIKE '%remote%' OR j.title LIKE '%remote%')`);
    }

    // Filter by experience level
    if (filters.experienceLevel && filters.experienceLevel !== 'all') {
      conditions.push(`j.experience_level = ?`);
      params.push(filters.experienceLevel);
    }

    // Filter by employment type
    if (filters.employmentType && filters.employmentType !== 'all') {
      conditions.push(`j.employment_type = ?`);
      params.push(filters.employmentType);
    }

    // Filter by source
    if (filters.source && filters.source !== 'all') {
      conditions.push(`j.source = ?`);
      params.push(filters.source);
    }

    // Filter by status (default: exclude expired)
    if (filters.status && filters.status !== 'all') {
      conditions.push(`j.status = ?`);
      params.push(filters.status);
    } else {
      conditions.push(`j.status != 'expired'`);
    }

    // Filter by minimum match score if userId provided
    if (userId && filters.minMatchScore !== undefined) {
      conditions.push(`ms.match_score >= ?`);
      params.push(filters.minMatchScore);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countSql = userId
      ? `SELECT COUNT(*) as total FROM jobs j LEFT JOIN match_scores ms ON j.id = ms.job_id AND ms.user_id = ? ${whereClause}`
      : `SELECT COUNT(*) as total FROM jobs j ${whereClause}`;

    const countParams = userId ? [userId, ...params] : [...params];
    const countRes = await db.get(countSql, countParams);
    const total = countRes?.total || 0;

    // Fetch data query
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    let dataSql = '';
    let dataParams: any[] = [];

    if (userId) {
      dataSql = `
        SELECT j.*, ms.match_score, ms.recommendation, ms.missing_skills, ms.matching_skills, ms.strengths
        FROM jobs j
        LEFT JOIN match_scores ms ON j.id = ms.job_id AND ms.user_id = ?
        ${whereClause}
        ORDER BY ms.match_score DESC, j.posted_date DESC, j.created_at DESC
        LIMIT ? OFFSET ?
      `;
      dataParams = [userId, ...params, limit, offset];
    } else {
      dataSql = `
        SELECT j.*
        FROM jobs j
        ${whereClause}
        ORDER BY j.posted_date DESC, j.created_at DESC
        LIMIT ? OFFSET ?
      `;
      dataParams = [...params, limit, offset];
    }

    const jobs = await db.all(dataSql, dataParams);
    return { jobs, total };
  }

  async markStaleJobs(staleDays: number = 14): Promise<number> {
    const db = await getDatabase();
    const res = await db.run(
      `UPDATE jobs
       SET status = 'stale', updated_at = CURRENT_TIMESTAMP
       WHERE last_seen_at < datetime('now', '-' || ? || ' days')
         AND status NOT IN ('stale', 'expired')`,
      [staleDays]
    );
    return res.changes || 0;
  }

  async markExpiredJobs(expireDays: number = 30): Promise<number> {
    const db = await getDatabase();
    const res = await db.run(
      `UPDATE jobs
       SET status = 'expired', updated_at = CURRENT_TIMESTAMP
       WHERE last_seen_at < datetime('now', '-' || ? || ' days')
         AND status != 'expired'`,
      [expireDays]
    );
    return res.changes || 0;
  }
}

export const jobRepository = new JobRepository();
