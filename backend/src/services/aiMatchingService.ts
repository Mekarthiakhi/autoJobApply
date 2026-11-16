import { logger } from '../utils/logger.js';
import { aiModelManager } from '../ai/index.js';

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

      const result = await aiModelManager.completeJSON<any>(prompt, {
        tier: 'fast',
        temperature: 0.7,
      });

      const data = result.parsed || {};
      return {
        score: typeof data.match_score === 'number' ? data.match_score : 0,
        missingSkills: Array.isArray(data.missing_skills) ? data.missing_skills : [],
        matchingSkills: Array.isArray(data.matching_skills) ? data.matching_skills : [],
        strengths: Array.isArray(data.strengths) ? data.strengths : [],
        recommendation: ['Apply', 'Maybe', 'Skip'].includes(data.recommendation)
          ? data.recommendation
          : 'Skip',
      };
    } catch (error) {
      logger.error('AI Matching error', error);
      return this.defaultResult();
    }
  }

  async optimizeResume(
    resumeContent: string,
    jobDescription: string
  ): Promise<any> {
    try {
      const prompt = `
You are an expert ATS (Applicant Tracking System) and career coach. Compare this resume against this job description.

RESUME:
${resumeContent}

JOB DESCRIPTION:
${jobDescription}

Give:
- ATS Score (0-100)
- Missing keywords (array)
- Skills to improve (array)
- Grammar suggestions (array)
- Experience gaps (array)
- Projects to add (array)

Return ONLY valid JSON with keys: ats_score, missing_keywords, skills_to_improve, grammar_suggestions, experience_gaps, projects_to_add.
`;

      const result = await aiModelManager.completeJSON<any>(prompt, {
        tier: 'quality',
        temperature: 0.7,
      });

      return result.parsed;
    } catch (error) {
      logger.error('Resume Optimization AI error', error);
      throw error;
    }
  }

  async negotiateSalary(
    jobOffer: string,
    currentSalary: string,
    experience: string,
    location: string,
    industry: string
  ): Promise<any> {
    try {
      const prompt = `
You are an expert career negotiator. I have a job offer and I want to negotiate my salary.
Job Offer Details: ${jobOffer}
Current Salary: ${currentSalary}
Experience: ${experience}
Location: ${location}
Industry: ${industry}

Suggest:
- Expected Salary
- Market Range
- Tips (array of strings)
- Negotiation Email (a ready-to-send draft email)

Return ONLY valid JSON with keys: expected_salary, market_range, tips, negotiation_email.
`;

      const result = await aiModelManager.completeJSON<any>(prompt, {
        tier: 'reasoning',
        temperature: 0.7,
      });

      return result.parsed;
    } catch (error) {
      logger.error('Salary Negotiation AI error', error);
      throw error;
    }
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
