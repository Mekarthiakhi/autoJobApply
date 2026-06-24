import { getDatabase, isDatabaseAvailable } from '../config/database.js';

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

const mockJobs: Job[] = [
  {
    id: '1', title: 'Senior AI Engineer', company_name: 'TechFlow', location: 'Remote', salary: '$120k-$160k',
    experience_level: 'Senior', required_skills: ['Python', 'PyTorch'], job_description: '...',
    apply_url: '', source: 'linkedin', posted_date: new Date(), external_id: 'li-1', status: 'new', created_at: new Date(), updated_at: new Date()
  },
  {
    id: '2', title: 'Frontend Developer', company_name: 'StartupInc', location: 'New York', salary: '$90k-$110k',
    experience_level: 'Mid', required_skills: ['React', 'TypeScript'], job_description: '...',
    apply_url: '', source: 'glassdoor', posted_date: new Date(), external_id: 'gd-1', status: 'new', created_at: new Date(), updated_at: new Date()
  }
];

export class JobRepository {
  async create(jobData: Omit<Job, 'id' | 'created_at' | 'updated_at'>): Promise<Job> {
    if (!isDatabaseAvailable()) {
      const newJob: Job = {
        ...jobData,
        id: Math.random().toString(36).substring(7),
        created_at: new Date(),
        updated_at: new Date()
      };
      mockJobs.push(newJob);
      return newJob;
    }
    const sql = getDatabase();
    const result = await sql`
      INSERT INTO jobs ${sql(jobData as any)}
      RETURNING *
    `;
    return result[0] as Job;
  }

  async findByExternalId(source: string, externalId: string): Promise<Job | null> {
    if (!isDatabaseAvailable()) {
      return mockJobs.find(j => j.source === source && j.external_id === externalId) || null;
    }
    const sql = getDatabase();
    const result = await sql`
      SELECT * FROM jobs WHERE source = ${source} AND external_id = ${externalId}
    `;
    return (result[0] as Job) || null;
  }

  async findById(id: string): Promise<Job | null> {
    if (!isDatabaseAvailable()) {
      return mockJobs.find(j => j.id === id) || null;
    }
    const sql = getDatabase();
    const result = await sql`SELECT * FROM jobs WHERE id = ${id}`;
    return (result[0] as Job) || null;
  }

  async findRecent(limit: number = 50): Promise<Job[]> {
    if (!isDatabaseAvailable()) {
      return [...mockJobs].sort((a, b) => b.posted_date.getTime() - a.posted_date.getTime()).slice(0, limit);
    }
    const sql = getDatabase();
    return sql`
      SELECT * FROM jobs 
      ORDER BY posted_date DESC 
      LIMIT ${limit}
    ` as unknown as Job[];
  }

  async findByKeywords(keywords: string[], limit: number = 50): Promise<Job[]> {
    if (!isDatabaseAvailable()) {
      return [...mockJobs].slice(0, limit); // Mock implementation
    }
    const sql = getDatabase();
    return sql`
      SELECT * FROM jobs 
      WHERE ${sql(keywords as any, 'required_skills')} && required_skills
      OR job_description ILIKE ANY(${keywords})
      ORDER BY posted_date DESC 
      LIMIT ${limit}
    ` as unknown as Job[];
  }
}
