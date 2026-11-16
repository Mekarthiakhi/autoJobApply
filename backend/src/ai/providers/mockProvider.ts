import {
  AICompletionOptions,
  AICompletionResult,
  AIProvider,
  ProviderName,
} from '../types.js';
import { estimateTokens } from '../costCalculator.js';

export class MockProvider implements AIProvider {
  readonly name: ProviderName = 'mock';

  isAvailable(): boolean {
    return true; // Always available as deterministic zero-key fallback
  }

  async complete(prompt: string, options: AICompletionOptions = {}): Promise<AICompletionResult> {
    const startTime = Date.now();
    const isJson = options.responseFormat === 'json';

    let content = '';
    let parsed: any = undefined;

    if (prompt.includes('match_score') || prompt.includes('Analyze the following resume against the job description')) {
      const matchResult = this.generateJobMatch(prompt);
      parsed = matchResult;
      content = JSON.stringify(matchResult, null, 2);
    } else if (prompt.includes('ats_score') || prompt.includes('ATS (Applicant Tracking System)')) {
      const atsResult = this.generateAtsOptimization(prompt);
      parsed = atsResult;
      content = JSON.stringify(atsResult, null, 2);
    } else if (prompt.includes('expected_salary') || prompt.includes('career negotiator')) {
      const salaryResult = this.generateSalaryNegotiation(prompt);
      parsed = salaryResult;
      content = JSON.stringify(salaryResult, null, 2);
    } else if (prompt.toLowerCase().includes('cover letter')) {
      content = this.generateCoverLetter(prompt);
      if (isJson) {
        parsed = { cover_letter: content };
        content = JSON.stringify(parsed);
      }
    } else {
      if (isJson) {
        parsed = { status: 'success', message: 'Deterministic heuristic response' };
        content = JSON.stringify(parsed);
      } else {
        content = 'Deterministic mock response generated for offline / fallback mode.';
      }
    }

    const durationMs = Date.now() - startTime;
    const promptTokens = estimateTokens(prompt);
    const completionTokens = estimateTokens(content);

    return {
      content,
      parsed,
      provider: 'mock',
      model: 'mock-deterministic',
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        estimatedCostUsd: 0,
      },
      durationMs,
    };
  }

  private generateJobMatch(prompt: string) {
    const reqSkillsMatch = prompt.match(/REQUIRED SKILLS:\s*(.*)/i);
    const requiredSkills: string[] = reqSkillsMatch && reqSkillsMatch[1]
      ? reqSkillsMatch[1].split(',').map((s) => s.trim()).filter(Boolean)
      : ['TypeScript', 'Node.js', 'React'];

    const resumeSectionMatch = prompt.match(/RESUME:\s*([\s\S]*?)(?:JOB TITLE:|$)/i);
    const resumeText = (resumeSectionMatch ? resumeSectionMatch[1] : prompt).toLowerCase();

    const matchingSkills: string[] = [];
    const missingSkills: string[] = [];

    for (const skill of requiredSkills) {
      if (resumeText.includes(skill.toLowerCase())) {
        matchingSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    }

    const total = requiredSkills.length || 1;
    const matchScore = Math.max(35, Math.min(95, Math.round((matchingSkills.length / total) * 100)));

    let recommendation: 'Apply' | 'Maybe' | 'Skip' = 'Skip';
    if (matchScore >= 70) recommendation = 'Apply';
    else if (matchScore >= 45) recommendation = 'Maybe';

    return {
      match_score: matchScore,
      missing_skills: missingSkills,
      matching_skills: matchingSkills,
      strengths: matchingSkills.length > 0
        ? matchingSkills.map((s) => `Demonstrated hands-on proficiency in ${s}`)
        : ['Demonstrated relevant software engineering fundamentals'],
      recommendation,
    };
  }

  private generateAtsOptimization(prompt: string) {
    return {
      ats_score: 78,
      missing_keywords: ['Cloud Architecture', 'CI/CD Pipelines', 'Automated Testing'],
      skills_to_improve: ['Production incident response', 'Distributed systems design'],
      grammar_suggestions: ['Use strong action verbs at the beginning of each bullet point'],
      experience_gaps: ['Quantify business impact with specific percentage improvements and dollar values'],
      projects_to_add: ['A full-stack project demonstrating end-to-end testing and containerized deployment'],
    };
  }

  private generateSalaryNegotiation(prompt: string) {
    return {
      expected_salary: '$135,000 - $155,000',
      market_range: '$130,000 - $160,000',
      tips: [
        'Acknowledge excitement about the offer before addressing compensation.',
        'Anchor to your specific technical contributions and market rates.',
        'Request flexibility in sign-on bonus, equity, or performance review cycles if base salary is firm.',
      ],
      negotiation_email:
        'Thank you very much for the offer to join the team. Based on my industry experience and market benchmarks for this role, I would like to discuss whether we can adjust the base compensation to better reflect these qualifications.',
    };
  }

  private generateCoverLetter(prompt: string): string {
    const titleMatch = prompt.match(/JOB TITLE:\s*([^\n\r]+)/i);
    const companyMatch = prompt.match(/COMPANY:\s*([^\n\r]+)/i);

    const title = titleMatch ? titleMatch[1].trim() : 'Software Engineer';
    const company = companyMatch ? companyMatch[1].trim() : 'the team';

    return `Dear Hiring Team,\n\n` +
      `I am writing to express my strong interest in the ${title} position at ${company}. ` +
      `With a proven background in software engineering, modern web technologies, and scalable systems, ` +
      `I have consistently delivered reliable software solutions that solve real business problems.\n\n` +
      `Throughout my career, I have focused on writing clean, maintainable code, collaborating closely across teams, ` +
      `and quickly adapting to evolving technical requirements. My hands-on experience directly matches ` +
      `the responsibilities described for this role, and I am excited about the opportunity to contribute ` +
      `to ${company}'s ongoing success.\n\n` +
      `Thank you for your time and consideration. I welcome the opportunity to discuss how my experience and skills ` +
      `align with your team's objectives.\n\n` +
      `Sincerely,\nCandidate`;
  }
}

