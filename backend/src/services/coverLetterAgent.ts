import { logger } from '../utils/logger.js';
import { CoverLetterRepository } from '../repositories/coverLetterRepository.js';
import { aiModelManager } from '../ai/index.js';

const coverLetterRepository = new CoverLetterRepository();

export class CoverLetterAgent {
  /**
   * Pure text generator for cover letters (used by WorkflowOrchestrator, previewers, tests).
   * Does not require database persistence or foreign keys.
   */
  async generateCoverLetter(
    resumeContent: string,
    jobDescription: string,
    jobTitle: string = 'Position',
    companyName: string = 'Company'
  ): Promise<string> {
    const prompt = `
You are an expert career coach. Write a concise, professional cover letter for the following job.

RULES:
- Use ONLY information from the provided resume. Do NOT invent or assume qualifications.
- Keep it under 300 words.
- Be specific about how the candidate's actual experience matches the role.
- Use a professional but warm tone.
- Do NOT include placeholder text like [Your Name] or [Date].

JOB TITLE: ${jobTitle}
COMPANY: ${companyName}

JOB DESCRIPTION:
${jobDescription.slice(0, 2000)}

RESUME:
${resumeContent.slice(0, 3000)}

Write the cover letter now. Output only the letter text, no additional commentary.
`;

    const result = await aiModelManager.complete(prompt, {
      tier: 'quality',
      temperature: 0.7,
      maxTokens: 600,
    });

    const content = result.content;
    if (!content || !content.trim()) throw new Error('Empty response from LLM');

    return content.trim();
  }

  /**
   * Generate a cover letter for a job using verified resume information only.
   * Stores the result in the database.
   */
  async generate(
    userId: string,
    jobId: string,
    resumeVersionId: string | null,
    jobTitle: string,
    companyName: string,
    jobDescription: string,
    resumeContent: string,
  ): Promise<{ id: string; content: string }> {
    logger.info('Generating cover letter', { agent: 'CoverLetter', userId, jobTitle, companyName });

    try {
      const trimmedContent = await this.generateCoverLetter(
        resumeContent,
        jobDescription,
        jobTitle,
        companyName
      );

      // Store in database
      const saved = await coverLetterRepository.create(userId, jobId, resumeVersionId, trimmedContent);

      logger.info('Cover letter generated and saved', {
        agent: 'CoverLetter',
        userId,
        coverId: saved?.id,
      });

      return { id: saved ? saved.id : 'generated', content: trimmedContent };
    } catch (error) {
      logger.error('Cover letter generation failed', { agent: 'CoverLetter', userId, error });
      throw error;
    }
  }
}

export const coverLetterAgent = new CoverLetterAgent();
