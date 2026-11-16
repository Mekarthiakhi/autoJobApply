import { getDatabase } from '../config/database.js';

export interface SavedSearch {
  id: string;
  user_id: string;
  keyword: string;
  location: string;
  experience?: string;
  salary?: string;
  remote: number;
  created_at: string;
}

export class SavedSearchRepository {
  async create(
    userId: string,
    data: {
      keyword: string;
      location?: string;
      experience?: string;
      salary?: string;
      remote?: boolean;
    }
  ): Promise<SavedSearch> {
    const db = await getDatabase();
    await db.run(
      `INSERT INTO saved_searches (user_id, keyword, location, experience, salary, remote)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        data.keyword,
        data.location || 'Remote',
        data.experience || null,
        data.salary || null,
        data.remote ? 1 : 0,
      ]
    );

    const row = await db.get(
      `SELECT * FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    return row as SavedSearch;
  }

  async findByUserId(userId: string): Promise<SavedSearch[]> {
    const db = await getDatabase();
    return (await db.all(
      `SELECT * FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    )) as SavedSearch[];
  }

  async findById(id: string): Promise<SavedSearch | null> {
    const db = await getDatabase();
    const row = await db.get(`SELECT * FROM saved_searches WHERE id = ?`, [id]);
    return (row || null) as any;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new Error('A valid userId is strictly required for deletion');
    }
    const db = await getDatabase();
    const res = await db.run(`DELETE FROM saved_searches WHERE id = ? AND user_id = ?`, [id, userId]);
    return (res.changes || 0) > 0;
  }

  async findAllActive(): Promise<SavedSearch[]> {
    const db = await getDatabase();
    return (await db.all(`SELECT * FROM saved_searches ORDER BY created_at DESC`)) as SavedSearch[];
  }
}

export const savedSearchRepository = new SavedSearchRepository();

