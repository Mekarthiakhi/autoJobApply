import { getDatabase } from '../config/database.js';

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: string;
  applied_at: Date;
  interview_scheduled: boolean;
  interview_date: Date | null;
  rejected: boolean;
  offer_received: boolean;
  notes: string;
  updated_at: Date;
}

export class ApplicationRepository {
  async create(userId: string, jobId: string): Promise<Application> {
    const sql = getDatabase();
    const result = await sql`
      INSERT INTO applications (user_id, job_id)
      VALUES (${userId}, ${jobId})
      ON CONFLICT (user_id, job_id) DO UPDATE SET updated_at = NOW()
      RETURNING *
    `;
    return result[0];
  }

  async findByUserId(userId: string): Promise<Application[]> {
    const sql = getDatabase();
    return sql`SELECT * FROM applications WHERE user_id = ${userId} ORDER BY applied_at DESC`;
  }

  async updateStatus(applicationId: string, status: string): Promise<Application> {
    const sql = getDatabase();
    const isInterview = status === 'interview';
    const isRejected = status === 'rejected';
    const isOffer = status === 'offer';

    const result = await sql`
      UPDATE applications 
      SET 
        status = ${status}, 
        interview_scheduled = ${isInterview},
        rejected = ${isRejected},
        offer_received = ${isOffer},
        updated_at = NOW()
      WHERE id = ${applicationId}
      RETURNING *
    `;
    return result[0];
  }

  async getStats(userId: string) {
    const sql = getDatabase();
    const result = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'applied') as applied,
        COUNT(*) FILTER (WHERE interview_scheduled) as interviews,
        COUNT(*) FILTER (WHERE rejected) as rejected,
        COUNT(*) FILTER (WHERE offer_received) as offers
      FROM applications
      WHERE user_id = ${userId}
    `;
    return result[0];
  }
}
