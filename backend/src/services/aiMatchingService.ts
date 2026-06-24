import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

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

      // Try Gemini first, then fall back to OpenAI
      if (env.GEMINI_API_KEY) {
        return await this.callGemini(prompt);
      } else if (env.OPENAI_API_KEY) {
        return await this.callOpenAI(prompt);
      } else {
        logger.warn('No AI API key configured. Set GEMINI_API_KEY or OPENAI_API_KEY in .env');
        return this.defaultResult();
      }
    } catch (error) {
      logger.error('AI Matching error', error);
      return this.defaultResult();
    }
  }

  private async callGemini(prompt: string): Promise<MatchResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('No response from Gemini');

    const result = JSON.parse(content);
    return {
      score: result.match_score ?? 0,
      missingSkills: result.missing_skills || [],
      matchingSkills: result.matching_skills || [],
      strengths: result.strengths || [],
      recommendation: result.recommendation || 'Skip',
    };
  }

  private async callOpenAI(prompt: string): Promise<MatchResult> {
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No response from OpenAI');

    const result = JSON.parse(content);
    return {
      score: result.match_score ?? 0,
      missingSkills: result.missing_skills || [],
      matchingSkills: result.matching_skills || [],
      strengths: result.strengths || [],
      recommendation: result.recommendation || 'Skip',
    };
  }

  private defaultResult(): MatchResult {
    return {
      score: 0,
      missingSkills: [],
      matchingSkills: [],
      strengths: [],
      recommendation: 'Skip',
    };
  }
}

export const aiMatchingService = new AIMatchingService();
