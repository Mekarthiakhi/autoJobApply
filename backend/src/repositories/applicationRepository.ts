import { getDatabase, isDatabaseAvailable } from '../config/database.js';

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

const mockApplications: Application[] = [];

export class ApplicationRepository {
  async create(userId: string, jobId: string): Promise<Application> {
    if (!isDatabaseAvailable()) {
      const newApp: Application = {
        id: Math.random().toString(36).substring(7),
        user_id: userId,
        job_id: jobId,
        status: 'applied',
        applied_at: new Date(),
        interview_scheduled: false,
        interview_date: null,
        rejected: false,
        offer_received: false,
        notes: '',
        updated_at: new Date()
      };
      mockApplications.push(newApp);
      return newApp;
    }
    const sql = getDatabase();
    const result = await sql`
      INSERT INTO applications (user_id, job_id)
      VALUES (${userId}, ${jobId})
      ON CONFLICT (user_id, job_id) DO UPDATE SET updated_at = NOW()
      RETURNING *
    `;
    return result[0] as Application;
  }

  async findByUserId(userId: string): Promise<Application[]> {
    if (!isDatabaseAvailable()) {
      return mockApplications.filter(a => a.user_id === userId).sort((a, b) => b.applied_at.getTime() - a.applied_at.getTime());
    }
    const sql = getDatabase();
    return sql`SELECT * FROM applications WHERE user_id = ${userId} ORDER BY applied_at DESC`;
  }

  async updateStatus(applicationId: string, status: string): Promise<Application> {
    if (!isDatabaseAvailable()) {
      const idx = mockApplications.findIndex(a => a.id === applicationId);
      if (idx !== -1) {
        mockApplications[idx].status = status;
        mockApplications[idx].updated_at = new Date();
        return mockApplications[idx];
      }
      throw new Error('Application not found');
    }
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
    return result[0] as Application;
  }

  async getStats(userId: string) {
    if (!isDatabaseAvailable()) {
      const userApps = mockApplications.filter(a => a.user_id === userId);
      return {
        applied: userApps.filter(a => a.status === 'applied').length,
        interviews: userApps.filter(a => a.interview_scheduled).length,
        rejected: userApps.filter(a => a.rejected).length,
        offers: userApps.filter(a => a.offer_received).length
      };
    }
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
    return result[0] as { applied: number; interviews: number; rejected: number; offers: number };
  }
}
