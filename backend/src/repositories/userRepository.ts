import { getDatabase, isDatabaseAvailable } from '../config/database.js';

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

// In-memory fallback
const mockUsers: User[] = [];

export class UserRepository {
  async create(
    email: string,
    passwordHash: string,
    fullName: string,
  ): Promise<User> {
    if (!isDatabaseAvailable()) {
      const newUser: User = {
        id: Math.random().toString(36).substring(7),
        email,
        password_hash: passwordHash,
        full_name: fullName,
        role: 'user',
        preferred_locations: [],
        employment_type: 'Full-Time',
        min_match_score: 80,
        created_at: new Date(),
        updated_at: new Date()
      };
      mockUsers.push(newUser);
      return newUser;
    }

    const sql = getDatabase();
    const result = await sql`
      INSERT INTO users (email, password_hash, full_name)
      VALUES (${email}, ${passwordHash}, ${fullName})
      RETURNING *
    `;
    return result[0] as User;
  }

  async findByEmail(email: string): Promise<User | null> {
    if (!isDatabaseAvailable()) {
      return mockUsers.find(u => u.email === email) || null;
    }
    const sql = getDatabase();
    const result = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;
    return (result[0] as User) || null;
  }

  async findById(id: string): Promise<User | null> {
    if (!isDatabaseAvailable()) {
      return mockUsers.find(u => u.id === id) || null;
    }
    const sql = getDatabase();
    const result = await sql`
      SELECT * FROM users WHERE id = ${id}
    `;
    return (result[0] as User) || null;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    if (!isDatabaseAvailable()) {
      const idx = mockUsers.findIndex(u => u.id === id);
      if (idx !== -1) {
        mockUsers[idx] = { ...mockUsers[idx], ...data } as User;
        return mockUsers[idx];
      }
      throw new Error('User not found in mock DB');
    }
    const sql = getDatabase();
    const result = await sql`
      UPDATE users
      SET ${sql(data as Record<string, any>, Object.keys(data) as string[])}
      WHERE id = ${id}
      RETURNING *
    `;
    return result[0] as User;
  }
}
