import { getDatabase } from '../config/database.js';

export interface Job {
  id: string;
  title: string;
  company_name: string;
  location: string;
  salary: string;
  experience_level: string;
  required_skills: string[];
  job_description: string;
  apply_url: string;
  source: string;
  posted_date: Date;
  external_id: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export class JobRepository {
  async create(jobData: Omit<Job, 'id' | 'created_at' | 'updated_at'>): Promise<Job> {
    const sql = getDatabase();
    const result = await sql`
      INSERT INTO jobs ${sql(jobData)}
      RETURNING *
    `;
    return result[0];
  }

  async findByExternalId(source: string, externalId: string): Promise<Job | null> {
    const sql = getDatabase();
    const result = await sql`
      SELECT * FROM jobs WHERE source = ${source} AND external_id = ${externalId}
    `;
    return result[0] || null;
  }

  async findById(id: string): Promise<Job | null> {
    const sql = getDatabase();
    const result = await sql`SELECT * FROM jobs WHERE id = ${id}`;
    return result[0] || null;
  }

  async findRecent(limit: number = 50): Promise<Job[]> {
    const sql = getDatabase();
    return sql`
      SELECT * FROM jobs 
      ORDER BY posted_date DESC 
      LIMIT ${limit}
    `;
  }

  async findByKeywords(keywords: string[], limit: number = 50): Promise<Job[]> {
    const sql = getDatabase();
    return sql`
      SELECT * FROM jobs 
      WHERE ${sql(keywords, 'required_skills')} && required_skills
      OR job_description ILIKE ANY(${keywords})
      ORDER BY posted_date DESC 
      LIMIT ${limit}
    `;
  }
}
