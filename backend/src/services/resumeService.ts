import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { candidateExtractor } from '../resumes/candidateExtractor.js';
import { StructuredResume } from '../resumes/types.js';

export interface ResumeData {
  skills: string[];
  experience: string;
  education: string;
  keywords: string[];
  structured?: StructuredResume;
}

export class ResumeService {
  async extractResumeData(textContent: string): Promise<ResumeData> {
    try {
      const structured = await candidateExtractor.extract(textContent);

      const skills = structured.skills.all;
      const experience = structured.experience
        .map(e => `${e.role} at ${e.company} (${e.startDate} - ${e.endDate}):\n${(e.highlights || []).map(h => `• ${h}`).join('\n')}`)
        .join('\n\n');
      const education = structured.education
        .map(e => `${e.degree} from ${e.institution}${e.graduationYear ? ` (${e.graduationYear})` : ''}`)
        .join('\n');
      const keywords = this.extractKeywords(textContent);

      return {
        skills,
        experience: experience.slice(0, 1000),
        education: education.slice(0, 500),
        keywords,
        structured,
      };
    } catch (error) {
      logger.error('Resume extraction error', error);
      return {
        skills: [],
        experience: '',
        education: '',
        keywords: [],
      };
    }
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'is', 'are', 'was', 'were', 'be', 'been', 'of', 'with', 'as',
      'this', 'that', 'from', 'by', 'about', 'into', 'over', 'after',
    ]);

    return Array.from(new Set(
      words
        .map(w => w.replace(/[^a-zA-Z]/g, ''))
        .filter(w => w.length > 3 && !stopwords.has(w))
    )).slice(0, 25);
  }

  async saveResume(
    userId: string,
    fileName: string,
    filePath: string,
    textContent: string,
    data: ResumeData,
  ) {
    const db = await getDatabase();
    
    const skillsJson = JSON.stringify(data.skills);
    const keywordsJson = JSON.stringify(data.keywords);
    const builderDataJson = data.structured ? JSON.stringify(data.structured) : null;
    
    await db.run(
      `INSERT INTO resumes (user_id, file_name, file_path, text_content, skills, experience, education, keywords, builder_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET 
         file_name = excluded.file_name,
         file_path = excluded.file_path,
         text_content = excluded.text_content,
         skills = excluded.skills,
         experience = excluded.experience,
         education = excluded.education,
         keywords = excluded.keywords,
         builder_data = COALESCE(excluded.builder_data, resumes.builder_data),
         updated_at = CURRENT_TIMESTAMP`,
      [userId, fileName, filePath, textContent, skillsJson, data.experience, data.education, keywordsJson, builderDataJson]
    );
    
    const result = await db.get(`SELECT * FROM resumes WHERE user_id = ?`, [userId]);
    return [result];
  }
}

export const resumeService = new ResumeService();
