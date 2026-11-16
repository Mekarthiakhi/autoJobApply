import { getDatabase } from '../config/database.js';

export interface CoverLetter {
  id: string;
  user_id: string;
  job_id: string | null;
  resume_version_id: string | null;
  content: string;
  generated_at: string;
}

export class CoverLetterRepository {
  async findByUserId(userId: string): Promise<CoverLetter[]> {
    const db = await getDatabase();
    return (await db.all(
      `SELECT cl.*, j.title as job_title, j.company_name
       FROM cover_letters cl
       LEFT JOIN jobs j ON cl.job_id = j.id
       WHERE cl.user_id = ?
       ORDER BY cl.generated_at DESC`,
      [userId]
    )) as any[];
  }

  async findById(id: string): Promise<CoverLetter | null> {
    const db = await getDatabase();
    const row = await db.get(
      `SELECT cl.*, j.title as job_title, j.company_name
       FROM cover_letters cl
       LEFT JOIN jobs j ON cl.job_id = j.id
       WHERE cl.id = ?`,
      [id]
    );
    return (row || null) as any;
  }

  async create(userId: string, jobId: string | null, resumeVersionId: string | null, content: string): Promise<CoverLetter> {
    const db = await getDatabase();
    await db.run(
      `INSERT INTO cover_letters (user_id, job_id, resume_version_id, content)
       VALUES (?, ?, ?, ?)`,
      [userId, jobId, resumeVersionId, content]
    );

    const row = await db.get(
      `SELECT * FROM cover_letters WHERE user_id = ? ORDER BY rowid DESC LIMIT 1`,
      [userId]
    );
    return row as CoverLetter;
  }

  async update(id: string, userId: string, content: string): Promise<CoverLetter | null> {
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new Error('A valid userId is strictly required to update a cover letter');
    }
    const db = await getDatabase();
    const result = await db.run(
      `UPDATE cover_letters SET content = ? WHERE id = ? AND user_id = ?`,
      [content, id, userId]
    );
    if (!result.changes || result.changes === 0) return null;
    return this.findById(id);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new Error('A valid userId is strictly required for deletion');
    }
    const db = await getDatabase();
    const result = await db.run(
      `DELETE FROM cover_letters WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    return (result.changes ?? 0) > 0;
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    return this.delete(id, userId);
  }
}
