import {
  NormalizedJob,
  CandidateScoringProfile,
  ExplainableScoreResult,
  ScoreExplanationFactor,
} from './types.js';

export class ExplainableScorer {
  /**
   * Score a job with transparent, explainable breakdown across 7 dimensions.
   */
  scoreJob(job: NormalizedJob, profile: CandidateScoringProfile): ExplainableScoreResult {
    const factors: ScoreExplanationFactor[] = [];

    // 1. Skills Match (Weight: 35)
    const skillsFactor = this.evaluateSkillsMatch(job, profile);
    factors.push(skillsFactor);

    // 2. Experience Match (Weight: 15)
    const expFactor = this.evaluateExperienceMatch(job, profile);
    factors.push(expFactor);

    // 3. Location & Remote Preference (Weight: 15)
    const locFactor = this.evaluateLocationMatch(job, profile);
    factors.push(locFactor);

    // 4. Salary Expectation (Weight: 15)
    const salaryFactor = this.evaluateSalaryMatch(job, profile);
    factors.push(salaryFactor);

    // 5. Job Title Relevance (Weight: 10)
    const titleFactor = this.evaluateTitleRelevance(job, profile);
    factors.push(titleFactor);

    // 6. Employment Type Match (Weight: 5)
    const typeFactor = this.evaluateEmploymentTypeMatch(job, profile);
    factors.push(typeFactor);

    // 7. Freshness (Weight: 5)
    const freshnessFactor = this.evaluateFreshness(job);
    factors.push(freshnessFactor);

    // Calculate total score
    const totalScore = Math.min(
      100,
      Math.max(0, factors.reduce((sum, f) => sum + f.score, 0))
    );

    let recommendation: 'Apply' | 'Maybe' | 'Skip' = 'Skip';
    if (totalScore >= 70) recommendation = 'Apply';
    else if (totalScore >= 45) recommendation = 'Maybe';

    const topPositives = factors
      .filter(f => f.score >= f.maxScore * 0.75)
      .map(f => f.name.toLowerCase());
    const topNegatives = factors
      .filter(f => f.score <= f.maxScore * 0.40)
      .map(f => f.name.toLowerCase());

    let summary = `Job scored ${totalScore}/100 (${recommendation}).`;
    if (topPositives.length > 0) {
      summary += ` Strong alignment in ${topPositives.join(' and ')}.`;
    }
    if (topNegatives.length > 0) {
      summary += ` Lower fit in ${topNegatives.join(' and ')}.`;
    }

    return {
      totalScore,
      recommendation,
      factors,
      summary,
    };
  }

  private evaluateSkillsMatch(job: NormalizedJob, profile: CandidateScoringProfile): ScoreExplanationFactor {
    const maxScore = 35;
    const candidateSkills = (profile.skills || []).map(s => s.toLowerCase());
    const jobSkills = job.requiredSkills.map(s => s.toLowerCase());

    if (jobSkills.length === 0) {
      return {
        name: 'Skills Match',
        weight: 35,
        score: 25,
        maxScore,
        reason: 'No explicit required skills listed in posting; evaluated on general software engineering background.',
      };
    }

    const matching = jobSkills.filter(js => candidateSkills.some(cs => cs.includes(js) || js.includes(cs)));
    const missing = jobSkills.filter(js => !candidateSkills.some(cs => cs.includes(js) || js.includes(cs)));

    const ratio = matching.length / jobSkills.length;
    const score = Math.round(ratio * maxScore);

    const matchSample = matching.slice(0, 3).join(', ');
    const reason = `${matching.length} of ${jobSkills.length} required skills matched (${matchSample || 'none'}). Missing: ${missing.slice(0, 3).join(', ') || 'none'}.`;

    return {
      name: 'Skills Match',
      weight: 35,
      score,
      maxScore,
      reason,
    };
  }

  private evaluateExperienceMatch(job: NormalizedJob, profile: CandidateScoringProfile): ScoreExplanationFactor {
    const maxScore = 15;
    const candidateLevel = profile.experienceLevel || 'mid';
    const jobLevel = job.experienceLevel;

    if (jobLevel === 'unspecified') {
      return {
        name: 'Experience Match',
        weight: 15,
        score: 12,
        maxScore,
        reason: `Experience level unspecified in job posting; neutral fit applied for candidate level '${candidateLevel}'.`,
      };
    }

    const levels = ['entry', 'mid', 'senior', 'lead', 'executive'];
    const candidateIdx = levels.indexOf(candidateLevel);
    const jobIdx = levels.indexOf(jobLevel);

    const diff = Math.abs(candidateIdx - jobIdx);
    let score = maxScore;
    if (diff === 1) score = 10;
    else if (diff === 2) score = 6;
    else if (diff >= 3) score = 2;

    return {
      name: 'Experience Match',
      weight: 15,
      score,
      maxScore,
      reason: diff === 0
        ? `Target seniority level '${jobLevel}' exactly matches candidate experience.`
        : `Role requests '${jobLevel}' level while candidate is '${candidateLevel}'.`,
    };
  }

  private evaluateLocationMatch(job: NormalizedJob, profile: CandidateScoringProfile): ScoreExplanationFactor {
    const maxScore = 15;
    const prefersRemote = profile.prefersRemote !== false;
    const targets = (profile.targetLocations || []).map(l => l.toLowerCase());

    if (job.isRemote && prefersRemote) {
      return {
        name: 'Location & Remote Preference',
        weight: 15,
        score: 15,
        maxScore,
        reason: 'Position is 100% Remote, perfectly matching candidate remote work preference.',
      };
    }

    const jobLoc = job.location.toLowerCase();
    const isTargetMatch = targets.some(t => jobLoc.includes(t) || t.includes(jobLoc));

    if (isTargetMatch) {
      return {
        name: 'Location & Remote Preference',
        weight: 15,
        score: 15,
        maxScore,
        reason: `Job location '${job.location}' matches candidate target location list.`,
      };
    }

    if (job.isRemote) {
      return {
        name: 'Location & Remote Preference',
        weight: 15,
        score: 12,
        maxScore,
        reason: `Position is remote.`,
      };
    }

    return {
      name: 'Location & Remote Preference',
      weight: 15,
      score: 4,
      maxScore,
      reason: `Location '${job.location}' does not match candidate preferred locations.`,
    };
  }

  private evaluateSalaryMatch(job: NormalizedJob, profile: CandidateScoringProfile): ScoreExplanationFactor {
    const maxScore = 15;
    const expectedMin = profile.minSalary;

    if (!expectedMin || expectedMin <= 0) {
      return {
        name: 'Salary Expectation',
        weight: 15,
        score: 15,
        maxScore,
        reason: 'No minimum salary constraint specified by candidate.',
      };
    }

    if (!job.salary.min && !job.salary.max) {
      return {
        name: 'Salary Expectation',
        weight: 15,
        score: 10,
        maxScore,
        reason: 'Compensation not listed in job description; neutral score assigned.',
      };
    }

    const maxOffered = job.salary.max || job.salary.min || 0;
    if (maxOffered >= expectedMin) {
      return {
        name: 'Salary Expectation',
        weight: 15,
        score: 15,
        maxScore,
        reason: `Offered salary range (${job.salary.raw}) satisfies candidate target of $${expectedMin.toLocaleString()}.`,
      };
    } else if (maxOffered >= expectedMin * 0.90) {
      return {
        name: 'Salary Expectation',
        weight: 15,
        score: 11,
        maxScore,
        reason: `Offered compensation (${job.salary.raw}) is within 10% of candidate minimum.`,
      };
    }

    return {
      name: 'Salary Expectation',
      weight: 15,
      score: 4,
      maxScore,
      reason: `Offered compensation (${job.salary.raw}) is lower than candidate minimum ($${expectedMin.toLocaleString()}).`,
    };
  }

  private evaluateTitleRelevance(job: NormalizedJob, profile: CandidateScoringProfile): ScoreExplanationFactor {
    const maxScore = 10;
    const roles = (profile.targetRoles || ['Software Engineer', 'Developer']).map(r => r.toLowerCase());
    const title = job.title.toLowerCase();

    const exactMatch = roles.some(r => title.includes(r) || r.includes(title));
    if (exactMatch) {
      return {
        name: 'Job Title Relevance',
        weight: 10,
        score: 10,
        maxScore,
        reason: `Job title '${job.title}' closely matches candidate target roles.`,
      };
    }

    const titleTokens = new Set(title.split(/\s+/));
    const tokenOverlap = roles.some(r => r.split(/\s+/).some(t => t.length > 3 && titleTokens.has(t)));

    if (tokenOverlap) {
      return {
        name: 'Job Title Relevance',
        weight: 10,
        score: 7,
        maxScore,
        reason: `Job title '${job.title}' partially relates to candidate target roles.`,
      };
    }

    return {
      name: 'Job Title Relevance',
      weight: 10,
      score: 3,
      maxScore,
      reason: `Job title '${job.title}' has low overlap with candidate target roles.`,
    };
  }

  private evaluateEmploymentTypeMatch(job: NormalizedJob, profile: CandidateScoringProfile): ScoreExplanationFactor {
    const maxScore = 5;
    const targetType = profile.preferredEmploymentType || 'Full-Time';

    if (job.employmentType === targetType) {
      return {
        name: 'Employment Type',
        weight: 5,
        score: 5,
        maxScore,
        reason: `Role employment type '${job.employmentType}' matches candidate target.`,
      };
    }

    return {
      name: 'Employment Type',
      weight: 5,
      score: 2,
      maxScore,
      reason: `Role is '${job.employmentType}' while candidate prefers '${targetType}'.`,
    };
  }

  private evaluateFreshness(job: NormalizedJob): ScoreExplanationFactor {
    const maxScore = 5;
    const postedTime = new Date(job.postedDate).getTime();
    const now = Date.now();
    const daysOld = Math.max(0, (now - postedTime) / (1000 * 60 * 60 * 24));

    if (daysOld <= 2) {
      return {
        name: 'Freshness',
        weight: 5,
        score: 5,
        maxScore,
        reason: 'Fresh posting published within the last 48 hours.',
      };
    } else if (daysOld <= 7) {
      return {
        name: 'Freshness',
        weight: 5,
        score: 4,
        maxScore,
        reason: `Posting is ${Math.round(daysOld)} days old (within past week).`,
      };
    } else if (daysOld <= 14) {
      return {
        name: 'Freshness',
        weight: 5,
        score: 3,
        maxScore,
        reason: `Posting is ${Math.round(daysOld)} days old (within 2 weeks).`,
      };
    }

    return {
      name: 'Freshness',
      weight: 5,
      score: 1,
      maxScore,
      reason: `Older posting published ${Math.round(daysOld)} days ago.`,
    };
  }
}

export const explainableScorer = new ExplainableScorer();

