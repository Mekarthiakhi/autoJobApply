import { OpenAI } from 'openai';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const isGemini = (env.GEMINI_API_KEY && env.GEMINI_API_KEY.startsWith('AIzaSy')) || 
                 (env.OPENAI_API_KEY && env.OPENAI_API_KEY.startsWith('AIzaSy'));

const openai = new OpenAI({
  apiKey: isGemini ? (env.GEMINI_API_KEY || env.OPENAI_API_KEY) : env.OPENAI_API_KEY,
  baseURL: isGemini ? 'https://generativelanguage.googleapis.com/v1beta/openai/' : undefined,
});

export interface MatchResult {
  score: number;
  missingSkills: string[];
  matchingSkills: string[];
  strengths: string[];
  recommendation: 'Apply' | 'Maybe' | 'Skip';
}

export class AIMatchingService {
  async analyzeJobMatch(
    resumeContent: string,
    jobDescription: string,
    jobTitle: string,
    requiredSkills: string[],
  ): Promise<MatchResult> {
    try {
      const prompt = `
You are an expert job matching AI. Analyze the following resume against the job description and provide a detailed match analysis.

RESUME:
${resumeContent}

JOB TITLE: ${jobTitle}
REQUIRED SKILLS: ${requiredSkills.join(', ')}

JOB DESCRIPTION:
${jobDescription}

Please analyze and provide a JSON response with:
1. match_score (0-100): Overall match percentage
2. missing_skills: Array of skills required but not found in resume
3. matching_skills: Array of skills that match between resume and job
4. strengths: Array of candidate's strong points for this role
5. recommendation: "Apply", "Maybe", or "Skip"

Respond only with valid JSON.
`;

      const response = await openai.chat.completions.create({
        model: isGemini ? 'gemini-1.5-flash' : 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('No response from OpenAI');

      // Strip potential markdown JSON code block ticks (```json ... ```)
      const cleanContent = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

      const result = JSON.parse(cleanContent);
      return {
        score: result.match_score,
        missingSkills: result.missing_skills || [],
        matchingSkills: result.matching_skills || [],
        strengths: result.strengths || [],
        recommendation: result.recommendation,
      };
    } catch (error) {
      logger.error('AI Matching error', error);
      return {
        score: 0,
        missingSkills: [],
        matchingSkills: [],
        strengths: [],
        recommendation: 'Skip',
      };
    }
  }
}

export const aiMatchingService = new AIMatchingService();
