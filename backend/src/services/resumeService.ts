import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';

export interface ResumeData {
  skills: string[];
  experience: string;
  education: string;
  keywords: string[];
}

export class ResumeService {
  async extractResumeData(textContent: string): Promise<ResumeData> {
    try {
      // Simple extraction logic - can be enhanced with AI
      const skills = this.extractSkills(textContent);
      const experience = this.extractSection(textContent, ['experience', 'work']);
      const education = this.extractSection(textContent, ['education', 'degree']);
      const keywords = this.extractKeywords(textContent);

      return {
        skills,
        experience,
        education,
        keywords,
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

  private extractSkills(text: string): string[] {
    const skillKeywords = [
      'javascript', 'typescript', 'react', 'node.js', 'html5', 'css3',
      'bootstrap', 'material ui', 'jquery', 'rest api', 'firebase',
      'git', 'github', 'python', 'java', 'sql', 'mongodb',
      'docker', 'kubernetes', 'aws', 'azure', 'gcp',
    ];

    const foundSkills = skillKeywords.filter(skill =>
      text.toLowerCase().includes(skill)
    );

    return [...new Set(foundSkills)];
  }

  private extractSection(text: string, keywords: string[]): string {
    const lines = text.split('\n');
    let inSection = false;
    let section = '';

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (keywords.some(k => lowerLine.includes(k))) {
        inSection = true;
      } else if (inSection && /^[A-Z]/.test(line)) {
        break;
      }

      if (inSection) {
        section += line + '\n';
      }
    }

    return section.slice(0, 500);
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'is', 'are', 'was', 'were', 'be', 'been', 'of', 'with', 'as',
    ]);

    return words
      .filter(w => w.length > 3 && !stopwords.has(w))
      .slice(0, 20);
  }

  async saveResume(
    userId: string,
    fileName: string,
    filePath: string,
    textContent: string,
    data: ResumeData,
  ) {
    const sql = getDatabase();
    return sql`
      INSERT INTO resumes (user_id, file_name, file_path, text_content, skills, experience, education, keywords)
      VALUES (${userId}, ${fileName}, ${filePath}, ${textContent}, ${data.skills}, ${data.experience}, ${data.education}, ${data.keywords})
      ON CONFLICT (user_id) DO UPDATE SET 
        file_name = ${fileName},
        file_path = ${filePath},
        text_content = ${textContent},
        skills = ${data.skills},
        experience = ${data.experience},
        education = ${data.education},
        keywords = ${data.keywords},
        updated_at = NOW()
      RETURNING *
    `;
  }
}

export const resumeService = new ResumeService();
