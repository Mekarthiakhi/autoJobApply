import { getDatabase } from '../config/database.js';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
  preferred_locations: string[];
  employment_type: string;
  min_match_score: number;
  created_at: Date;
  updated_at: Date;
}

export class UserRepository {
  async create(
    email: string,
    passwordHash: string,
    fullName: string,
  ): Promise<User> {
    const sql = getDatabase();
    const result = await sql`
      INSERT INTO users (email, password_hash, full_name)
      VALUES (${email}, ${passwordHash}, ${fullName})
      RETURNING *
    `;
    return result[0];
  }

  async findByEmail(email: string): Promise<User | null> {
    const sql = getDatabase();
    const result = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;
    return result[0] || null;
  }

  async findById(id: string): Promise<User | null> {
    const sql = getDatabase();
    const result = await sql`
      SELECT * FROM users WHERE id = ${id}
    `;
    return result[0] || null;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const sql = getDatabase();
    const result = await sql`
      UPDATE users
      SET ${sql(data, Object.keys(data))}
      WHERE id = ${id}
      RETURNING *
    `;
    return result[0];
  }
}
