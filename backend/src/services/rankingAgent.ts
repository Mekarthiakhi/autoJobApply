import { aiMatchingService, MatchResult } from './aiMatchingService.js';
import { logger } from '../utils/logger.js';

export interface RankingBreakdown {
  skillMatch: number;
  titleMatch: number;
  locationMatch: number;
  salaryMatch: number;
}

export interface RankingResult {
  score: number;
  breakdown: RankingBreakdown;
  recommendation: 'Apply' | 'Maybe' | 'Skip';
  matchingSkills: string[];
  missingSkills: string[];
  strengths: string[];
}

export class RankingAgent {
  async scoreAndRank(
    resumeContent: string,
    jobDescription: string,
    jobTitle: string = 'Position',
    requiredSkills: string[] = []
  ): Promise<RankingResult> {
    return this.scoreJob(resumeContent, jobDescription, jobTitle, requiredSkills);
  }

  /**
   * Score a job 0-100 based on resume match.
   * Uses the existing AIMatchingService for the core LLM call,
   * then enhances with structured breakdown.
   */
  async scoreJob(
    resumeContent: string,
    jobDescription: string,
    jobTitle: string,
    requiredSkills: string[],
    userLocation?: string,
    jobLocation?: string,
    userMinSalary?: string,
    jobSalary?: string,
  ): Promise<RankingResult> {
    logger.info('Scoring job', { agent: 'Ranking', jobTitle });

    try {
      // Delegate to existing AI matching service
      const aiResult: MatchResult = await aiMatchingService.analyzeJobMatch(
        resumeContent,
        jobDescription,
        jobTitle,
        requiredSkills,
      );

      // Compute breakdown components
      const breakdown = this.computeBreakdown(
        aiResult,
        resumeContent,
        jobTitle,
        userLocation,
        jobLocation,
        userMinSalary,
        jobSalary,
      );

      // Weighted composite score
      const score = Math.round(
        breakdown.skillMatch * 0.4 +
        breakdown.titleMatch * 0.25 +
        breakdown.locationMatch * 0.2 +
        breakdown.salaryMatch * 0.15
      );

      const clampedScore = Math.max(0, Math.min(100, score));
      const recommendation = clampedScore >= 75 ? 'Apply' : clampedScore >= 50 ? 'Maybe' : 'Skip';

      logger.info('Job scored', {
        agent: 'Ranking',
        jobTitle,
        score: clampedScore,
        recommendation,
      });

      return {
        score: clampedScore,
        breakdown,
        recommendation,
        matchingSkills: aiResult.matchingSkills,
        missingSkills: aiResult.missingSkills,
        strengths: aiResult.strengths,
      };
    } catch (error) {
      logger.error('Ranking failed, returning zero score', { agent: 'Ranking', jobTitle, error });
      return {
        score: 0,
        breakdown: { skillMatch: 0, titleMatch: 0, locationMatch: 0, salaryMatch: 0 },
        recommendation: 'Skip',
        matchingSkills: [],
        missingSkills: [],
        strengths: [],
      };
    }
  }

  private computeBreakdown(
    aiResult: MatchResult,
    resumeContent: string,
    jobTitle: string,
    userLocation?: string,
    jobLocation?: string,
    userMinSalary?: string,
    jobSalary?: string,
  ): RankingBreakdown {
    // Skill match comes directly from the AI score
    const skillMatch = aiResult.score;

    // Title match: check if resume mentions keywords from the job title
    const titleWords = jobTitle.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const resumeLower = resumeContent.toLowerCase();
    const titleHits = titleWords.filter(w => resumeLower.includes(w)).length;
    const titleMatch = titleWords.length > 0 ? Math.round((titleHits / titleWords.length) * 100) : 50;

    // Location match: simple substring check
    let locationMatch = 50; // neutral if no data
    if (userLocation && jobLocation) {
      const userLoc = userLocation.toLowerCase();
      const jobLoc = jobLocation.toLowerCase();
      if (jobLoc.includes('remote') || jobLoc.includes('anywhere')) {
        locationMatch = 100;
      } else if (jobLoc.includes(userLoc) || userLoc.includes(jobLoc)) {
        locationMatch = 100;
      } else {
        locationMatch = 20;
      }
    }

    // Salary match: basic comparison
    let salaryMatch = 50; // neutral if no data
    if (userMinSalary && jobSalary) {
      const userSal = this.parseSalaryNumber(userMinSalary);
      const jobSal = this.parseSalaryNumber(jobSalary);
      if (userSal > 0 && jobSal > 0) {
        salaryMatch = jobSal >= userSal ? 100 : Math.round((jobSal / userSal) * 100);
      }
    }

    return { skillMatch, titleMatch, locationMatch, salaryMatch };
  }

  private parseSalaryNumber(salary: string): number {
    const cleaned = salary.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
}

export const rankingAgent = new RankingAgent();
