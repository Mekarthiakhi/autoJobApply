import { getDatabase } from '../config/database.js';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
  preferred_locations: string;
  employment_type: string;
  min_match_score: number;
  is_verified: boolean;
  verification_token: string | null;
  reset_token: string | null;
  reset_token_expires: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class UserRepository {
  async create(
    email: string,
    passwordHash: string,
    fullName: string,
    verificationToken: string
  ): Promise<User> {
    const db = await getDatabase();
    await db.run(
      `INSERT INTO users (email, password_hash, full_name, verification_token)
       VALUES (?, ?, ?, ?)`,
      [email, passwordHash, fullName, verificationToken]
    );
    
    return this.findByEmail(email) as Promise<User>;
  }

  async findByEmail(email: string): Promise<User | null> {
    const db = await getDatabase();
    const user = await db.get(`SELECT * FROM users WHERE email = ?`, [email]);
    if (!user) return null;
    return {
      ...user,
      is_verified: Boolean(user.is_verified)
    } as User;
  }

  async findById(id: string): Promise<User | null> {
    const db = await getDatabase();
    const user = await db.get(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!user) return null;
    return {
      ...user,
      is_verified: Boolean(user.is_verified)
    } as User;
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    const db = await getDatabase();
    const user = await db.get(`SELECT * FROM users WHERE verification_token = ?`, [token]);
    if (!user) return null;
    return {
      ...user,
      is_verified: Boolean(user.is_verified)
    } as User;
  }

  async findByResetToken(token: string): Promise<User | null> {
    const db = await getDatabase();
    const user = await db.get(`SELECT * FROM users WHERE reset_token = ?`, [token]);
    if (!user) return null;
    return {
      ...user,
      is_verified: Boolean(user.is_verified)
    } as User;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const db = await getDatabase();
    
    if (typeof data.is_verified === 'boolean') {
      (data as any).is_verified = data.is_verified ? 1 : 0;
    }

    const keys = Object.keys(data);
    if (keys.length === 0) return this.findById(id) as Promise<User>;

    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (data as any)[k]);
    values.push(id);

    await db.run(
      `UPDATE users SET ${setClause} WHERE id = ?`,
      values
    );
    
    return this.findById(id) as Promise<User>;
  }
}
