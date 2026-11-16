import { getDatabase } from '../config/database.js';

export interface ResumeVersion {
  id: string;
  user_id: string;
  label: string;
  file_name: string | null;
  text_content: string | null;
  skills: string;
  structured_data: string | null;
  parent_version_id: string | null;
  target_job_id: string | null;
  ats_score: number | null;
  version_number: number;
  is_default: number;
  created_at: string;
  updated_at: string;
}

export interface CreateResumeVersionDTO {
  label: string;
  fileName?: string | null;
  textContent?: string | null;
  skills?: string[];
  structuredData?: any;
  parentVersionId?: string | null;
  targetJobId?: string | null;
  atsScore?: number | null;
  versionNumber?: number;
}

export interface UpdateResumeVersionDTO {
  label?: string;
  fileName?: string | null;
  textContent?: string | null;
  skills?: string[];
  structuredData?: any;
  atsScore?: number | null;
}

export class ResumeVersionRepository {
  async findByUserId(userId: string): Promise<ResumeVersion[]> {
    const db = await getDatabase();
    return (await db.all(
      `SELECT * FROM resume_versions WHERE user_id = ? ORDER BY is_default DESC, updated_at DESC`,
      [userId]
    )) as ResumeVersion[];
  }

  async findById(id: string): Promise<ResumeVersion | null> {
    const db = await getDatabase();
    const row = await db.get(`SELECT * FROM resume_versions WHERE id = ?`, [id]);
    return (row || null) as ResumeVersion | null;
  }

  async findByIdForUser(id: string, userId: string): Promise<ResumeVersion | null> {
    const db = await getDatabase();
    const row = await db.get(
      `SELECT * FROM resume_versions WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    return (row || null) as ResumeVersion | null;
  }

  async checkOwnership(id: string, userId: string): Promise<'AUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND'> {
    const db = await getDatabase();
    const row = await db.get(`SELECT id, user_id FROM resume_versions WHERE id = ?`, [id]);
    if (!row) return 'NOT_FOUND';
    return row.user_id === userId ? 'AUTHORIZED' : 'FORBIDDEN';
  }

  async findDefault(userId: string): Promise<ResumeVersion | null> {
    const db = await getDatabase();
    const row = await db.get(
      `SELECT * FROM resume_versions WHERE user_id = ? AND is_default = 1`,
      [userId]
    );
    return (row || null) as ResumeVersion | null;
  }

  async findByJobId(userId: string, jobId: string): Promise<ResumeVersion[]> {
    const db = await getDatabase();
    return (await db.all(
      `SELECT * FROM resume_versions WHERE user_id = ? AND target_job_id = ? ORDER BY created_at DESC`,
      [userId, jobId]
    )) as ResumeVersion[];
  }

  async findHistory(userId: string, rootVersionId?: string): Promise<ResumeVersion[]> {
    const db = await getDatabase();
    if (rootVersionId) {
      return (await db.all(
        `SELECT * FROM resume_versions 
         WHERE user_id = ? AND (id = ? OR parent_version_id = ?)
         ORDER BY version_number ASC, created_at ASC`,
        [userId, rootVersionId, rootVersionId]
      )) as ResumeVersion[];
    }

    return (await db.all(
      `SELECT * FROM resume_versions WHERE user_id = ? ORDER BY parent_version_id NULLS FIRST, version_number ASC, created_at DESC`,
      [userId]
    )) as ResumeVersion[];
  }

  async create(
    userId: string,
    label: string,
    fileName: string | null = null,
    textContent: string | null = null,
    skills: string[] = [],
    extra: Partial<CreateResumeVersionDTO> = {}
  ): Promise<ResumeVersion> {
    const db = await getDatabase();
    const skillsJson = JSON.stringify(skills || []);
    const structuredJson = extra.structuredData ? JSON.stringify(extra.structuredData) : null;

    // If this is the first version, make it default
    const existing = await this.findByUserId(userId);
    const isDefault = existing.length === 0 ? 1 : 0;
    const versionNumber = extra.versionNumber || (extra.parentVersionId ? 2 : 1);

    await db.run(
      `INSERT INTO resume_versions (
        user_id, label, file_name, text_content, skills, 
        structured_data, parent_version_id, target_job_id, ats_score, version_number, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        label,
        fileName || extra.fileName || null,
        textContent || extra.textContent || null,
        skillsJson,
        structuredJson,
        extra.parentVersionId || null,
        extra.targetJobId || null,
        extra.atsScore !== undefined ? extra.atsScore : null,
        versionNumber,
        isDefault,
      ]
    );

    const row = await db.get(
      `SELECT * FROM resume_versions WHERE user_id = ? ORDER BY rowid DESC LIMIT 1`,
      [userId]
    );
    return row as ResumeVersion;
  }

  async update(id: string, data: UpdateResumeVersionDTO): Promise<ResumeVersion | null> {
    const db = await getDatabase();
    const sets: string[] = [];
    const values: unknown[] = [];

    if (data.label !== undefined) { sets.push('label = ?'); values.push(data.label); }
    if (data.fileName !== undefined) { sets.push('file_name = ?'); values.push(data.fileName); }
    if (data.textContent !== undefined) { sets.push('text_content = ?'); values.push(data.textContent); }
    if (data.skills !== undefined) { sets.push('skills = ?'); values.push(JSON.stringify(data.skills)); }
    if (data.structuredData !== undefined) {
      sets.push('structured_data = ?');
      values.push(data.structuredData ? JSON.stringify(data.structuredData) : null);
    }
    if (data.atsScore !== undefined) { sets.push('ats_score = ?'); values.push(data.atsScore); }

    if (sets.length === 0) return this.findById(id);

    sets.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await db.run(`UPDATE resume_versions SET ${sets.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  async clone(userId: string, sourceId: string, newLabel: string): Promise<ResumeVersion> {
    const source = await this.findById(sourceId);
    if (!source || source.user_id !== userId) {
      throw new Error('Source resume version not found or forbidden');
    }

    const skills = source.skills ? JSON.parse(source.skills) : [];
    const structuredData = source.structured_data ? JSON.parse(source.structured_data) : null;

    return this.create(
      userId,
      newLabel,
      source.file_name,
      source.text_content,
      skills,
      {
        structuredData,
        parentVersionId: source.id,
        versionNumber: (source.version_number || 1) + 1,
        atsScore: source.ats_score,
      }
    );
  }

  async setDefault(userId: string, id: string): Promise<void> {
    const db = await getDatabase();
    await db.run(`UPDATE resume_versions SET is_default = 0 WHERE user_id = ?`, [userId]);
    await db.run(`UPDATE resume_versions SET is_default = 1 WHERE id = ? AND user_id = ?`, [id, userId]);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new Error('A valid userId is strictly required for deletion');
    }
    const db = await getDatabase();
    const result = await db.run(
      `DELETE FROM resume_versions WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    return (result.changes ?? 0) > 0;
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    return this.delete(id, userId);
  }
}
