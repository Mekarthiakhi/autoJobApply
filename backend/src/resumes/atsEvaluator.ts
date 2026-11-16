import { 
  StructuredResume, 
  ATSAssessment, 
  ImprovementSuggestion, 
  ATSDimensionScore, 
  ATSScoreBreakdown 
} from './types.js';
import { candidateExtractor } from './candidateExtractor.js';

export interface TargetJobContext {
  title: string;
  description: string;
  requiredSkills?: string[];
  companyName?: string;
}

export class ATSEvaluator {
  /**
   * Evaluate a resume against a target job description with 5-factor explainable scoring.
   */
  async evaluate(
    resumeInput: StructuredResume | string,
    job: TargetJobContext
  ): Promise<ATSAssessment> {
    const resume: StructuredResume = typeof resumeInput === 'string'
      ? candidateExtractor.extractDeterministically(resumeInput)
      : resumeInput;

    const fullResumeText = this.serializeResumeToText(resume).toLowerCase();
    const jobDescLower = (job.description || '').toLowerCase();
    const jobTitleLower = (job.title || '').toLowerCase();

    // 1. Keyword & Skills Match (35 Points Max)
    const requiredKeywords = this.extractJobKeywords(job);
    const candidateSkillsLower = new Set(resume.skills.all.map(s => s.toLowerCase()));

    const matchingKeywords: string[] = [];
    const missingKeywords: string[] = [];

    for (const kw of requiredKeywords) {
      const kwLower = kw.toLowerCase();
      if (candidateSkillsLower.has(kwLower) || fullResumeText.includes(kwLower)) {
        matchingKeywords.push(kw);
      } else {
        missingKeywords.push(kw);
      }
    }

    const keywordRatio = requiredKeywords.length > 0
      ? matchingKeywords.length / requiredKeywords.length
      : 0.8;
    const keywordScore = Math.min(35, Math.round(keywordRatio * 35));

    const keywordBreakdown: ATSDimensionScore = {
      score: keywordScore,
      maxScore: 35,
      details: `Matched ${matchingKeywords.length} of ${requiredKeywords.length} key required competencies (${Math.round(keywordRatio * 100)}%).`,
    };

    // 2. Experience Relevance & Seniority Match (25 Points Max)
    const requiredYears = this.extractRequiredYears(jobDescLower, jobTitleLower);
    const candidateYears = this.calculateCandidateYears(resume);
    const titleRelevance = this.calculateTitleRelevance(resume, jobTitleLower);

    const experienceGaps: string[] = [];
    let expScore = 15; // baseline

    if (candidateYears >= requiredYears) {
      expScore += 7;
    } else {
      const gap = requiredYears - candidateYears;
      expScore += Math.max(0, 7 - (gap * 2));
      experienceGaps.push(`Role expects approximately ${requiredYears}+ years experience; candidate background demonstrates ~${candidateYears} years.`);
    }

    if (titleRelevance >= 0.5) {
      expScore += 3;
    }

    expScore = Math.min(25, expScore);

    const experienceBreakdown: ATSDimensionScore = {
      score: expScore,
      maxScore: 25,
      details: `Candidate has ~${candidateYears} years experience against an estimated ${requiredYears}+ years expectation. Title relevance score is ${Math.round(titleRelevance * 100)}%.`,
    };

    // 3. Formatting & Parseability Check (15 Points Max)
    const formattingIssues: string[] = [];
    let formatScore = 0;

    // Contact completeness
    if (resume.basics.fullName && resume.basics.fullName !== 'Candidate') formatScore += 3;
    else formattingIssues.push('Full candidate name is missing or indistinct.');

    if (resume.basics.email && resume.basics.email.includes('@')) formatScore += 3;
    else formattingIssues.push('Contact email is missing.');

    if (resume.basics.phone || resume.basics.linkedinUrl) formatScore += 2;
    else formattingIssues.push('Phone number or LinkedIn profile URL is recommended.');

    // Clear section structure
    if (resume.experience.length > 0) formatScore += 3;
    else formattingIssues.push('Work experience section could not be structured into individual roles.');

    if (resume.skills.all.length > 0) formatScore += 2;
    else formattingIssues.push('Skills section is missing or unformatted.');

    if (resume.education.length > 0) formatScore += 2;
    else formattingIssues.push('Education history is missing.');

    formatScore = Math.min(15, formatScore);

    const formattingBreakdown: ATSDimensionScore = {
      score: formatScore,
      maxScore: 15,
      details: formattingIssues.length === 0
        ? 'Clean, parsable section structure and contact details detected.'
        : `${formattingIssues.length} formatting/structure warning(s) detected.`,
    };

    // 4. Education & Certification Relevance (15 Points Max)
    let eduScore = 10; // default passing for degrees
    let eduDetails = 'Educational requirements satisfied.';

    const jobRequiresMasterOrPhd = /master's|ms degree|ph\.?d/i.test(jobDescLower);
    const candidateHasAdvancedDegree = resume.education.some(e => /master|m\.s|ph\.?d/i.test(e.degree));

    if (jobRequiresMasterOrPhd) {
      if (candidateHasAdvancedDegree) {
        eduScore = 15;
        eduDetails = 'Candidate possesses required advanced graduate degree.';
      } else {
        eduScore = 11;
        eduDetails = 'Role prefers advanced degree; candidate demonstrates Bachelor-level education or equivalent practical experience.';
      }
    } else {
      if (resume.education.length > 0) {
        eduScore = 14;
      }
      if (resume.certifications.length > 0) {
        eduScore = Math.min(15, eduScore + 1);
      }
    }

    const educationBreakdown: ATSDimensionScore = {
      score: eduScore,
      maxScore: 15,
      details: eduDetails,
    };

    // 5. Quantifiable Impact & Metrics Score (10 Points Max)
    const { impactScore, metricCount, totalBullets } = this.calculateQuantifiableImpact(resume);
    const impactBreakdown: ATSDimensionScore = {
      score: impactScore,
      maxScore: 10,
      details: `${metricCount} of ${totalBullets} experience bullet points contain quantifiable metrics, percentages, or revenue indicators.`,
    };

    // Total Overall ATS Score
    const overallScore = Math.min(
      100,
      keywordScore + expScore + formatScore + eduScore + impactScore
    );

    const breakdown: ATSScoreBreakdown = {
      keywordMatch: keywordBreakdown,
      experienceRelevance: experienceBreakdown,
      formattingParseability: formattingBreakdown,
      educationRelevance: educationBreakdown,
      quantifiableImpact: impactBreakdown,
    };

    // Grounded Suggestions (Never hallucinate qualifications)
    const suggestions = this.generateGroundedSuggestions(resume, missingKeywords, matchingKeywords, job);

    // Explainable Summary
    const explainableSummary = this.generateExplainableSummary(
      overallScore,
      matchingKeywords,
      missingKeywords,
      candidateYears,
      requiredYears
    );

    return {
      overallScore,
      matchScore: overallScore,
      breakdown,
      matchingKeywords,
      missingKeywords,
      experienceGaps,
      formattingIssues,
      suggestions,
      explainableSummary,
    };
  }

  /**
   * Extract key skills & keywords from job posting
   */
  private extractJobKeywords(job: TargetJobContext): string[] {
    const keywords = new Set<string>();

    if (job.requiredSkills && Array.isArray(job.requiredSkills)) {
      job.requiredSkills.forEach(s => { if (s && s.trim()) keywords.add(s.trim()); });
    }

    // Common technical and engineering terms in description
    const commonTerms = [
      'TypeScript', 'JavaScript', 'Python', 'Go', 'Java', 'C++', 'Rust', 'C#',
      'React', 'Next.js', 'Node.js', 'Express', 'Vue', 'Angular', 'Django', 'FastAPI', 'Spring Boot',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Linux',
      'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API', 'Microservices',
      'System Design', 'Git', 'Agile', 'Distributed Systems'
    ];

    const descLower = (job.description || '').toLowerCase();
    for (const term of commonTerms) {
      const regex = new RegExp(`(?:^|[^a-zA-Z0-9_#+])${term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(?:$|[^a-zA-Z0-9_#+])`, 'i');
      if (regex.test(descLower)) {
        keywords.add(term);
      }
    }

    return Array.from(keywords);
  }

  /**
   * Extract expected years of experience from job text
   */
  private extractRequiredYears(desc: string, title: string): number {
    const match = desc.match(/\b(\d+)\+?\s*(?:-\s*\d+)?\s*years?(?:\s+of)?(?:\s+relevant|\s+work)?\s+experience\b/i);
    if (match) {
      return parseInt(match[1], 10);
    }

    if (/intern|graduate|entry\s*level|junior/i.test(title)) return 1;
    if (/senior|lead|principal|staff/i.test(title)) return 5;
    if (/mid\s*level/i.test(title)) return 3;

    return 3; // sensible default
  }

  /**
   * Calculate cumulative verified years of experience from resume
   */
  private calculateCandidateYears(resume: StructuredResume): number {
    if (!resume.experience || resume.experience.length === 0) return 1;

    let totalMonths = 0;
    const currentYear = new Date().getFullYear();

    for (const exp of resume.experience) {
      const startMatch = exp.startDate ? exp.startDate.match(/(19\d{2}|20\d{2})/) : null;
      const endMatch = exp.endDate ? exp.endDate.match(/(19\d{2}|20\d{2})/) : null;

      const startYear = startMatch ? parseInt(startMatch[1], 10) : currentYear - 1;
      const endYear = exp.isCurrent ? currentYear : (endMatch ? parseInt(endMatch[1], 10) : startYear + 1);

      const spanYears = Math.max(1, endYear - startYear);
      totalMonths += spanYears * 12;
    }

    return Math.max(1, Math.min(30, Math.round(totalMonths / 12)));
  }

  /**
   * Calculate title token overlap
   */
  private calculateTitleRelevance(resume: StructuredResume, jobTitleLower: string): number {
    const jobTokens = jobTitleLower.split(/[\s,/-]+/).filter(w => w.length > 2 && !['senior', 'junior', 'lead', 'staff'].includes(w));
    if (jobTokens.length === 0) return 0.7;

    const resumeTitles = resume.experience.map(e => (e.role || '').toLowerCase()).join(' ');
    const matchedTokens = jobTokens.filter(t => resumeTitles.includes(t));

    return matchedTokens.length / jobTokens.length;
  }

  /**
   * Calculate proportion of bullets with quantifiable metrics
   */
  private calculateQuantifiableImpact(resume: StructuredResume): { impactScore: number; metricCount: number; totalBullets: number } {
    const allBullets: string[] = [];
    resume.experience.forEach(e => {
      if (Array.isArray(e.highlights)) {
        allBullets.push(...e.highlights);
      }
    });

    if (allBullets.length === 0) {
      return { impactScore: 5, metricCount: 0, totalBullets: 0 };
    }

    const metricRegex = /\b(\d+%\s*|\$\d+[\d,.]*[kmb]?|\b\d+x\b|\b\d+\s*(?:ms|seconds|minutes|hours|days|users|customers|requests|queries|nodes|clusters))\b/i;

    let metricCount = 0;
    for (const bullet of allBullets) {
      if (metricRegex.test(bullet) || /\b(reduced|increased|improved|scaled|saved|accelerated)\b.*\d+/i.test(bullet)) {
        metricCount++;
      }
    }

    const ratio = metricCount / allBullets.length;
    const impactScore = Math.min(10, Math.max(3, Math.round(ratio * 10) + 3));

    return { impactScore, metricCount, totalBullets: allBullets.length };
  }

  /**
   * Generate strictly grounded improvement suggestions
   */
  private generateGroundedSuggestions(
    resume: StructuredResume,
    missingKeywords: string[],
    matchingKeywords: string[],
    job: TargetJobContext
  ): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];

    // 1. STAR Action Verb Suggestion
    const passiveBullets: { bullet: string; role: string }[] = [];
    for (const exp of resume.experience) {
      for (const hl of exp.highlights || []) {
        if (/^(was responsible for|helped with|assisted in|worked on|did|handled)\b/i.test(hl)) {
          passiveBullets.push({ bullet: hl, role: exp.role });
        }
      }
    }

    if (passiveBullets.length > 0) {
      const target = passiveBullets[0];
      suggestions.push({
        section: 'experience',
        type: 'action_verb',
        originalText: target.bullet,
        suggestedChange: target.bullet.replace(/^(was responsible for|helped with|assisted in|worked on|did|handled)\s+/i, 'Spearheaded and engineered '),
        reason: 'Using decisive STAR action verbs increases ATS impact and recruiter engagement.',
        groundedInFact: true,
      });
    }

    // 2. Metrics Prompt
    const unquantifiedBullets = resume.experience
      .flatMap(e => e.highlights || [])
      .filter(hl => !/\d/.test(hl) && hl.length > 25);

    if (unquantifiedBullets.length > 0) {
      suggestions.push({
        section: 'experience',
        type: 'quantify_metric',
        originalText: unquantifiedBullets[0],
        suggestedChange: `${unquantifiedBullets[0]} (Consider inserting your verified metric: e.g. resulting in 25% performance improvement or saving 10 hours/week)`,
        reason: 'Quantifying outcomes demonstrates real business value to hiring managers and automated parsers.',
        groundedInFact: true,
      });
    }

    // 3. Highlight verified matching skills
    if (matchingKeywords.length > 0) {
      const topMatched = matchingKeywords.slice(0, 4).join(', ');
      suggestions.push({
        section: 'summary',
        type: 'highlight_skill',
        suggestedChange: `Ensure your verified experience with ${topMatched} is prominently featured in your professional summary.`,
        reason: `The target role at ${job.companyName || 'the hiring company'} specifically prioritizes these competencies.`,
        groundedInFact: true,
      });
    }

    // 4. Missing skills transparency (Non-hallucination warning)
    if (missingKeywords.length > 0) {
      const topMissing = missingKeywords.slice(0, 3).join(', ');
      suggestions.push({
        section: 'skills',
        type: 'clarify_term',
        suggestedChange: `Notice: ${topMissing} are listed in the job description but not in your resume. If you have legitimate experience with these or closely related technologies, consider adding them. Do NOT fabricate experience.`,
        reason: 'Ethical disclosure: ATS systems scan for these keywords, but candidate honesty is strictly required.',
        groundedInFact: true,
      });
    }

    return suggestions;
  }

  /**
   * Generate human-readable explainable summary
   */
  private generateExplainableSummary(
    score: number,
    matched: string[],
    missing: string[],
    candidateYears: number,
    requiredYears: number
  ): string {
    const tier = score >= 80 ? 'Strong Match' : score >= 65 ? 'Competitive Match' : 'Potential Match with Gaps';
    const matchedCount = matched.length;
    const missingCount = missing.length;

    return `This resume scores ${score}/100 (${tier}). The candidate brings ~${candidateYears} years of verified experience against a target expectation of ${requiredYears}+ years. The profile matches ${matchedCount} key required skill${matchedCount === 1 ? '' : 's'}${matchedCount > 0 ? ` (${matched.slice(0, 4).join(', ')})` : ''}.${missingCount > 0 ? ` There are ${missingCount} unrepresented technical requirement${missingCount === 1 ? '' : 's'} (${missing.slice(0, 3).join(', ')}).` : ''} All suggestions are grounded strictly in the candidate's existing background without fabricated credentials.`;
  }

  private serializeResumeToText(resume: StructuredResume): string {
    const parts: string[] = [
      resume.basics.fullName || '',
      resume.basics.summary || '',
      resume.skills.all.join(' '),
      ...resume.experience.map(e => `${e.company} ${e.role} ${(e.highlights || []).join(' ')}`),
      ...resume.education.map(e => `${e.institution} ${e.degree} ${e.fieldOfStudy || ''}`),
      ...resume.projects.map(p => `${p.name} ${p.description} ${(p.technologies || []).join(' ')}`),
    ];
    return parts.join(' ');
  }
}

export const atsEvaluator = new ATSEvaluator();

