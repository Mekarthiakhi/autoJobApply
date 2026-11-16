import { 
  StructuredResume, 
  TailoredResumeDraft, 
  CategorizedSkills, 
  WorkExperienceItem 
} from './types.js';
import { atsEvaluator, TargetJobContext } from './atsEvaluator.js';

export class ResumeTailoringEngine {
  /**
   * Generate a job-tailored resume draft from a verified baseline resume.
   * Guarantees non-destructive operation: does not mutate or replace original.
   */
  async generateTailoredDraft(
    baselineResume: StructuredResume,
    parentVersionId: string,
    job: TargetJobContext & { id: string }
  ): Promise<TailoredResumeDraft> {
    const jobTitle = job.title || 'Engineering Role';
    const companyName = job.companyName || 'Target Company';
    const optimizationsApplied: string[] = [];

    // 1. Initial ATS evaluation
    const initialEval = await atsEvaluator.evaluate(baselineResume, job);
    const matchedSkills = new Set(initialEval.matchingKeywords.map(s => s.toLowerCase()));

    // 2. Tailor Professional Summary
    const tailoredSummary = this.buildTailoredSummary(baselineResume, jobTitle, companyName, initialEval.matchingKeywords);
    optimizationsApplied.push('Crafted job-aligned professional summary highlighting verified technical background.');

    // 3. Reorder and foreground matching skills
    const tailoredSkills = this.reorderSkillsForTargetJob(baselineResume.skills, matchedSkills);
    optimizationsApplied.push('Prioritized job-matching technical skills to the front of skill categories for ATS scannability.');

    // 4. Prioritize experience bullet points
    const tailoredExperience = this.prioritizeExperienceHighlights(baselineResume.experience, matchedSkills);
    optimizationsApplied.push('Organized work experience bullet points to emphasize relevant technical achievements.');

    // 5. Assemble complete structured draft
    const fullStructuredData: StructuredResume = {
      basics: {
        ...baselineResume.basics,
        summary: tailoredSummary,
      },
      skills: tailoredSkills,
      experience: tailoredExperience,
      education: [...baselineResume.education],
      projects: [...baselineResume.projects],
      certifications: [...baselineResume.certifications],
    };

    // Calculate expected ATS score with tailored adjustments
    const postEval = await atsEvaluator.evaluate(fullStructuredData, job);

    return {
      id: `tailored-${Date.now()}`,
      targetJobId: job.id,
      parentVersionId,
      jobTitle,
      companyName,
      tailoredSummary,
      tailoredSkills,
      tailoredExperience,
      tailoredProjects: fullStructuredData.projects,
      fullStructuredData,
      atsScoreExpected: postEval.overallScore,
      optimizationsApplied,
      isReviewable: true,
    };
  }

  /**
   * Craft professional summary without hallucinated credentials
   */
  private buildTailoredSummary(
    resume: StructuredResume,
    jobTitle: string,
    companyName: string,
    matchingSkills: string[]
  ): string {
    const candidateName = resume.basics.fullName || 'Candidate';
    const primaryTitle = resume.experience[0]?.role || 'Software Engineer';
    const skillsHighlight = matchingSkills.slice(0, 4).join(', ');

    if (skillsHighlight) {
      return `${primaryTitle} with demonstrated expertise in ${skillsHighlight}. Proven track record designing and delivering robust, scalable systems. Seeking to leverage verified technical background as a ${jobTitle} at ${companyName}.`;
    }

    return `${primaryTitle} with strong engineering fundamentals and experience delivering high-quality software solutions. Ready to contribute technical rigor and collaborative problem-solving as a ${jobTitle} at ${companyName}.`;
  }

  /**
   * Reorder skills so matching skills appear first in each category
   */
  private reorderSkillsForTargetJob(
    original: CategorizedSkills,
    matchedSet: Set<string>
  ): CategorizedSkills {
    const reorderList = (list: string[]): string[] => {
      const high: string[] = [];
      const low: string[] = [];
      for (const item of list) {
        if (matchedSet.has(item.toLowerCase())) {
          high.push(item);
        } else {
          low.push(item);
        }
      }
      return [...high, ...low];
    };

    return {
      languages: reorderList(original.languages || []),
      frameworks: reorderList(original.frameworks || []),
      cloudDevOps: reorderList(original.cloudDevOps || []),
      databases: reorderList(original.databases || []),
      tools: reorderList(original.tools || []),
      softSkills: reorderList(original.softSkills || []),
      all: reorderList(original.all || []),
    };
  }

  /**
   * Prioritize experience bullet points highlighting target skills and metrics
   */
  private prioritizeExperienceHighlights(
    experiences: WorkExperienceItem[],
    matchedSet: Set<string>
  ): WorkExperienceItem[] {
    return experiences.map(exp => {
      if (!exp.highlights || exp.highlights.length <= 1) return { ...exp };

      const scoredBullets = exp.highlights.map(bullet => {
        let score = 0;
        const bLower = bullet.toLowerCase();

        // Bonus for matched skills mentioned
        matchedSet.forEach(s => {
          if (bLower.includes(s)) score += 3;
        });

        // Bonus for quantifiable metrics
        if (/\d+[%$kmbx]/i.test(bullet) || /\b(reduced|improved|increased|scaled)\b/i.test(bLower)) {
          score += 2;
        }

        return { bullet, score };
      });

      scoredBullets.sort((a, b) => b.score - a.score);

      return {
        ...exp,
        highlights: scoredBullets.map(sb => sb.bullet),
      };
    });
  }
}

export const resumeTailoringEngine = new ResumeTailoringEngine();

