import { 
  StructuredResume, 
  CandidateBasics, 
  CategorizedSkills, 
  WorkExperienceItem, 
  EducationItem, 
  ProjectItem, 
  CertificationItem 
} from './types.js';
import { aiModelManager } from '../ai/index.js';
import { logger } from '../utils/logger.js';
import { extractMobilePhoneFromResume } from '../utils/phoneExtractor.js';

// Predefined skill dictionary for high-precision extraction
const SKILL_DICTIONARY = {
  languages: [
    'javascript', 'typescript', 'python', 'java', 'go', 'golang', 'c++', 'c#', 'rust',
    'ruby', 'php', 'swift', 'kotlin', 'scala', 'sql', 'bash', 'shell', 'html', 'css', 'r'
  ],
  frameworks: [
    'react', 'react native', 'next.js', 'vue', 'vue.js', 'angular', 'node.js', 'express',
    'express.js', 'nestjs', 'django', 'fastapi', 'flask', 'spring', 'spring boot', 'rails',
    'laravel', 'asp.net', 'tailwind', 'bootstrap', 'graphql'
  ],
  cloudDevOps: [
    'aws', 'amazon web services', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes',
    'k8s', 'terraform', 'ansible', 'helm', 'ci/cd', 'github actions', 'jenkins', 'circleci',
    'linux', 'nginx', 'prometheus', 'grafana', 'datadog'
  ],
  databases: [
    'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'sqlite', 'elasticsearch',
    'dynamodb', 'cassandra', 'snowflake', 'bigquery', 'oracle', 'firebase', 'supabase'
  ],
  tools: [
    'git', 'github', 'gitlab', 'jira', 'confluence', 'postman', 'swagger', 'figma',
    'vs code', 'vite', 'webpack', 'npm', 'yarn', 'pnpm'
  ],
  softSkills: [
    'leadership', 'mentoring', 'team leadership', 'agile', 'scrum', 'kanban',
    'communication', 'problem solving', 'cross-functional collaboration', 'system design',
    'code review', 'critical thinking', 'project management'
  ]
};

export class CandidateExtractor {
  /**
   * Extract structured resume information from raw text.
   * Attempts AI-powered structured extraction with deterministic regex fallback.
   */
  async extract(rawText: string): Promise<StructuredResume> {
    if (!rawText || !rawText.trim()) {
      return this.emptyStructuredResume();
    }

    try {
      // 1. Try AI-powered structured extraction if available
      const aiResult = await this.extractWithAI(rawText);
      if (aiResult && this.isValidStructuredResume(aiResult)) {
        return aiResult;
      }
    } catch (err: any) {
      logger.warn('AI resume extraction failed or skipped, falling back to deterministic extraction', {
        error: err.message
      });
    }

    // 2. High-precision deterministic extraction
    return this.extractDeterministically(rawText);
  }

  /**
   * Attempt AI structured extraction
   */
  private async extractWithAI(rawText: string): Promise<StructuredResume | null> {
    const prompt = `
You are an expert HR technologist and resume parser. Parse the following resume text into a structured JSON object.

RULES:
- Extract ONLY facts present in the text. Do NOT fabricate or assume any experience, dates, degrees, or skills.
- Categorize skills into languages, frameworks, cloudDevOps, databases, tools, softSkills, and all.
- Break work experience into individual jobs with company, role, dates, isCurrent, and bullet point highlights.
- Extract education, projects, and certifications where available.

RESUME TEXT:
${rawText.slice(0, 5000)}

Return ONLY valid JSON matching this schema:
{
  "basics": {
    "fullName": "Candidate Name",
    "email": "email@example.com",
    "phone": "phone number",
    "location": "City, Country",
    "linkedinUrl": "url",
    "githubUrl": "url",
    "portfolioUrl": "url",
    "summary": "Professional summary"
  },
  "skills": {
    "languages": ["TypeScript"],
    "frameworks": ["React", "Node.js"],
    "cloudDevOps": ["AWS", "Docker"],
    "databases": ["PostgreSQL"],
    "tools": ["Git"],
    "softSkills": ["Leadership"],
    "all": ["TypeScript", "React", "Node.js", "AWS", "Docker", "PostgreSQL", "Git", "Leadership"]
  },
  "experience": [
    {
      "id": "exp-1",
      "company": "Company Name",
      "role": "Title",
      "location": "Location",
      "startDate": "YYYY-MM or Mon YYYY",
      "endDate": "Present or Mon YYYY",
      "isCurrent": true,
      "highlights": ["Key achievement 1", "Key achievement 2"]
    }
  ],
  "education": [
    {
      "id": "edu-1",
      "institution": "University Name",
      "degree": "Degree",
      "fieldOfStudy": "Major",
      "graduationYear": "YYYY"
    }
  ],
  "projects": [
    {
      "id": "proj-1",
      "name": "Project Name",
      "description": "Description",
      "technologies": ["React", "Node.js"],
      "link": "url"
    }
  ],
  "certifications": [
    {
      "id": "cert-1",
      "name": "Cert Name",
      "issuer": "Issuer",
      "issueDate": "YYYY"
    }
  ]
}
`;

    const res = await aiModelManager.completeJSON<StructuredResume>(prompt, {
      tier: 'fast',
      temperature: 0.1,
      timeoutMs: 8000,
    });

    return res.parsed || null;
  }

  /**
   * Deterministic regex- and heuristics-based structured extractor
   */
  extractDeterministically(rawText: string): StructuredResume {
    const basics = this.extractBasics(rawText);
    const skills = this.extractSkills(rawText);
    const experience = this.extractExperience(rawText);
    const education = this.extractEducation(rawText);
    const projects = this.extractProjects(rawText);
    const certifications = this.extractCertifications(rawText);

    return {
      basics,
      skills,
      experience,
      education,
      projects,
      certifications,
    };
  }

  /**
   * Extract candidate contact information & summary
   */
  private extractBasics(rawText: string): CandidateBasics {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

    // Full Name: typically the first non-empty line unless it starts with a keyword
    let fullName = 'Candidate';
    if (lines.length > 0) {
      const firstLine = lines[0];
      if (!firstLine.toLowerCase().includes('resume') && !firstLine.toLowerCase().includes('curriculum') && firstLine.length < 60) {
        fullName = firstLine.replace(/[^a-zA-Z\s.-]/g, '').trim() || 'Candidate';
      }
    }

    // Email regex
    const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
    const email = emailMatch ? emailMatch[0] : '';

    // Phone extraction (international, Indian, US formats)
    const phone = extractMobilePhoneFromResume(rawText) || undefined;

    // LinkedIn URL
    const linkedinMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
    const linkedinUrl = linkedinMatch ? (linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`) : undefined;

    // GitHub URL
    const githubMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i);
    const githubUrl = githubMatch ? (githubMatch[0].startsWith('http') ? githubMatch[0] : `https://${githubMatch[0]}`) : undefined;

    // Portfolio / website
    const websiteMatch = rawText.match(/https?:\/\/(?!www\.linkedin|www\.github)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*/i);
    const portfolioUrl = websiteMatch ? websiteMatch[0] : undefined;

    // Location heuristic (e.g. "San Francisco, CA" or "Bangalore, India")
    const locationMatch = rawText.match(/\b([A-Z][a-zA-Z\s]+,\s*(?:[A-Z]{2}|[A-Z][a-zA-Z\s]+))\b/);
    const location = locationMatch ? locationMatch[1].trim() : undefined;

    // Summary / Profile section
    const summary = this.extractSectionText(rawText, ['summary', 'profile', 'objective', 'about me'], 500);

    return {
      fullName,
      email,
      phone,
      location,
      linkedinUrl,
      githubUrl,
      portfolioUrl,
      summary: summary || undefined,
    };
  }

  /**
   * Extract and categorize skills
   */
  private extractSkills(rawText: string): CategorizedSkills {
    const lower = rawText.toLowerCase();
    const categories: Record<keyof typeof SKILL_DICTIONARY, string[]> = {
      languages: [],
      frameworks: [],
      cloudDevOps: [],
      databases: [],
      tools: [],
      softSkills: [],
    };

    const allSet = new Set<string>();

    for (const [category, skillList] of Object.entries(SKILL_DICTIONARY) as [keyof typeof SKILL_DICTIONARY, string[]][]) {
      for (const skill of skillList) {
        // Match word boundaries for skills (e.g. avoid matching "r" inside "react")
        const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(?:^|[^a-zA-Z0-9_#+])${escaped}(?:$|[^a-zA-Z0-9_#+])`, 'i');
        if (regex.test(lower)) {
          // Normalize display casing
          const displaySkill = this.toSkillDisplay(skill);
          categories[category].push(displaySkill);
          allSet.add(displaySkill);
        }
      }
    }

    return {
      languages: categories.languages,
      frameworks: categories.frameworks,
      cloudDevOps: categories.cloudDevOps,
      databases: categories.databases,
      tools: categories.tools,
      softSkills: categories.softSkills,
      all: Array.from(allSet),
    };
  }

  /**
   * Extract work experience items
   */
  private extractExperience(rawText: string): WorkExperienceItem[] {
    const sectionText = this.extractSectionText(rawText, ['experience', 'work experience', 'employment history', 'work history'], 3000);
    if (!sectionText) return [];

    const lines = sectionText.split('\n').map(l => l.trim()).filter(Boolean);
    const items: WorkExperienceItem[] = [];

    let currentItem: Partial<WorkExperienceItem> | null = null;
    let currentHighlights: string[] = [];
    let pendingHeaderLine = '';

    // Date range regex (e.g. "2020 - Present", "Jan 2019 - Dec 2021", "06/2018 - 08/2020")
    const dateRegex = /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{1,2}\/\d{4}|\d{4})\s*(?:-|–|—|to)\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{1,2}\/\d{4}|\d{4}|present|current)\b/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line);
      const dateMatch = line.match(dateRegex);

      if (dateMatch) {
        // If we were building an item, flush it
        if (currentItem && currentItem.company) {
          items.push({
            id: `exp-${items.length + 1}`,
            company: currentItem.company,
            role: currentItem.role || 'Software Engineer',
            location: currentItem.location,
            startDate: currentItem.startDate || '',
            endDate: currentItem.endDate || 'Present',
            isCurrent: currentItem.isCurrent ?? false,
            highlights: currentHighlights,
          });
          currentHighlights = [];
        }

        const startDate = dateMatch[1];
        const endDate = dateMatch[2];
        const isCurrent = /present|current/i.test(endDate);

        // Header context: either from this line without date, or from pendingHeaderLine
        const inLineText = line.replace(dateMatch[0], '').replace(/[•|()]/g, ' ').trim();
        const headerText = inLineText.length > 3 ? inLineText : pendingHeaderLine;

        let role = 'Software Engineer';
        let company = 'Company';
        let location = undefined;

        if (headerText) {
          const atParts = headerText.split(/\s+at\s+/i);
          if (atParts.length > 1) {
            role = atParts[0].trim();
            const compLoc = atParts[1].split(/,\s*/);
            company = compLoc[0].trim();
            location = compLoc.slice(1).join(', ').trim() || undefined;
          } else {
            const commaParts = headerText.split(/,\s*/);
            company = commaParts[0].trim();
            role = commaParts[1]?.trim() || 'Software Engineer';
            location = commaParts.slice(2).join(', ').trim() || undefined;
          }
        }

        currentItem = {
          company,
          role,
          location,
          startDate,
          endDate,
          isCurrent,
        };
        pendingHeaderLine = '';
      } else if (isBullet) {
        const cleanedBullet = line.replace(/^[•\-*]\s*|\d+\.\s*/, '').trim();
        if (cleanedBullet.length > 5) {
          currentHighlights.push(cleanedBullet);
        }
      } else {
        pendingHeaderLine = line;
      }
    }

    if (currentItem && currentItem.company) {
      items.push({
        id: `exp-${items.length + 1}`,
        company: currentItem.company,
        role: currentItem.role || 'Engineer',
        location: currentItem.location,
        startDate: currentItem.startDate || '',
        endDate: currentItem.endDate || 'Present',
        isCurrent: currentItem.isCurrent ?? false,
        highlights: currentHighlights,
      });
    }

    return items;
  }

  /**
   * Extract education items
   */
  private extractEducation(rawText: string): EducationItem[] {
    const sectionText = this.extractSectionText(rawText, ['education', 'academic background', 'degrees'], 1500);
    if (!sectionText) return [];

    const lines = sectionText.split('\n').map(l => l.trim()).filter(Boolean);
    const items: EducationItem[] = [];

    const degreeRegex = /\b(bachelor|master|ph\.?d|b\.?s\.?|m\.?s\.?|b\.?tech|m\.?tech|associate)\b/i;
    const yearRegex = /\b(19\d{2}|20\d{2})\b/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (degreeRegex.test(line) || /university|college|institute|polytechnic/i.test(line)) {
        const yearMatch = line.match(yearRegex) || (lines[i + 1] ? lines[i + 1].match(yearRegex) : null);
        const graduationYear = yearMatch ? yearMatch[1] : undefined;

        let institution = 'University';
        let degree = 'Degree';
        let fieldOfStudy = undefined;

        if (/university|college|institute/i.test(line)) {
          institution = line.split(/[,–-]/)[0].trim();
          if (lines[i + 1] && degreeRegex.test(lines[i + 1])) {
            degree = lines[i + 1];
          }
        } else {
          degree = line.split(/[,–-]/)[0].trim();
          if (lines[i + 1] && /university|college|institute/i.test(lines[i + 1])) {
            institution = lines[i + 1];
          }
        }

        // Field of study check (e.g. "in Computer Science")
        const fieldMatch = `${line} ${lines[i + 1] || ''}`.match(/\bin\s+([A-Za-z\s]+)/i);
        if (fieldMatch) fieldOfStudy = fieldMatch[1].trim();

        items.push({
          id: `edu-${items.length + 1}`,
          institution,
          degree,
          fieldOfStudy,
          graduationYear,
        });

        if (items.length >= 3) break;
      }
    }

    return items;
  }

  /**
   * Extract projects
   */
  private extractProjects(rawText: string): ProjectItem[] {
    const sectionText = this.extractSectionText(rawText, ['projects', 'personal projects', 'technical projects', 'key projects'], 1500);
    if (!sectionText) return [];

    const lines = sectionText.split('\n').map(l => l.trim()).filter(Boolean);
    const projects: ProjectItem[] = [];

    let currentProject: Partial<ProjectItem> | null = null;

    for (const line of lines) {
      if (line.startsWith('•') || line.startsWith('-')) {
        const bullet = line.replace(/^[•\-*]\s*/, '').trim();
        if (currentProject) {
          currentProject.description = (currentProject.description ? currentProject.description + ' ' : '') + bullet;
        }
      } else if (line.length < 60 && !line.includes('@')) {
        if (currentProject && currentProject.name) {
          projects.push({
            id: `proj-${projects.length + 1}`,
            name: currentProject.name,
            description: currentProject.description || '',
            technologies: currentProject.technologies || [],
          });
        }

        currentProject = {
          name: line.replace(/[:|–-].*$/, '').trim(),
          description: '',
          technologies: [],
        };
      }
    }

    if (currentProject && currentProject.name) {
      projects.push({
        id: `proj-${projects.length + 1}`,
        name: currentProject.name,
        description: currentProject.description || '',
        technologies: currentProject.technologies || [],
      });
    }

    return projects.slice(0, 5);
  }

  /**
   * Extract certifications
   */
  private extractCertifications(rawText: string): CertificationItem[] {
    const sectionText = this.extractSectionText(rawText, ['certifications', 'licenses', 'credentials'], 1000);
    if (!sectionText) return [];

    const lines = sectionText.split('\n').map(l => l.trim()).filter(Boolean);
    const items: CertificationItem[] = [];

    for (const line of lines) {
      if (line.length > 5 && line.length < 100) {
        const clean = line.replace(/^[•\-*]\s*/, '').trim();
        const parts = clean.split(/[-–|by]\s+/i);
        items.push({
          id: `cert-${items.length + 1}`,
          name: parts[0]?.trim() || clean,
          issuer: parts[1]?.trim() || 'Accredited Issuer',
        });
      }
    }

    return items.slice(0, 5);
  }

  /**
   * Helper: extract section text between headings
   */
  private extractSectionText(text: string, sectionHeadings: string[], maxLength: number = 2000): string {
    const lines = text.split('\n');
    let inSection = false;
    let sectionLines: string[] = [];

    const allKnownHeadings = [
      'experience', 'work experience', 'employment history', 'work history', 'education', 'skills',
      'technical skills', 'projects', 'featured projects', 'certifications', 'summary', 'profile', 'objective'
    ];

    const isHeadingMatch = (lineClean: string, heading: string): boolean => {
      if (lineClean.length > 40) return false;
      return (
        lineClean === heading ||
        lineClean.startsWith(heading + ' ') ||
        lineClean.startsWith(heading + ':') ||
        lineClean.startsWith(heading + ' -') ||
        lineClean.startsWith(heading + ' –')
      );
    };

    for (const line of lines) {
      const clean = line.trim().toLowerCase().replace(/[:#]/g, '');
      if (!clean) {
        if (inSection) sectionLines.push(line);
        continue;
      }

      const isTargetHeading = sectionHeadings.some(h => isHeadingMatch(clean, h));

      if (isTargetHeading) {
        inSection = true;
        continue;
      }

      if (inSection) {
        // If we hit another major section heading, stop
        const isOtherHeading = allKnownHeadings.some(h => isHeadingMatch(clean, h) && !sectionHeadings.includes(h));
        if (isOtherHeading) {
          break;
        }
        sectionLines.push(line);
      }
    }

    return sectionLines.join('\n').slice(0, maxLength).trim();
  }

  private toSkillDisplay(skill: string): string {
    const map: Record<string, string> = {
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'python': 'Python',
      'golang': 'Go',
      'go': 'Go',
      'c++': 'C++',
      'c#': 'C#',
      'react': 'React',
      'react native': 'React Native',
      'next.js': 'Next.js',
      'vue': 'Vue.js',
      'vue.js': 'Vue.js',
      'angular': 'Angular',
      'node.js': 'Node.js',
      'express': 'Express.js',
      'express.js': 'Express.js',
      'nestjs': 'NestJS',
      'django': 'Django',
      'fastapi': 'FastAPI',
      'spring boot': 'Spring Boot',
      'aws': 'AWS',
      'azure': 'Azure',
      'gcp': 'GCP',
      'docker': 'Docker',
      'kubernetes': 'Kubernetes',
      'terraform': 'Terraform',
      'postgresql': 'PostgreSQL',
      'postgres': 'PostgreSQL',
      'mysql': 'MySQL',
      'mongodb': 'MongoDB',
      'redis': 'Redis',
      'sqlite': 'SQLite',
      'github actions': 'GitHub Actions',
      'ci/cd': 'CI/CD',
    };
    return map[skill.toLowerCase()] || skill.charAt(0).toUpperCase() + skill.slice(1);
  }

  private isValidStructuredResume(obj: any): obj is StructuredResume {
    return (
      obj &&
      typeof obj === 'object' &&
      obj.basics &&
      typeof obj.basics.fullName === 'string' &&
      obj.skills &&
      Array.isArray(obj.skills.all)
    );
  }

  private emptyStructuredResume(): StructuredResume {
    return {
      basics: { fullName: '', email: '' },
      skills: {
        languages: [],
        frameworks: [],
        cloudDevOps: [],
        databases: [],
        tools: [],
        softSkills: [],
        all: [],
      },
      experience: [],
      education: [],
      projects: [],
      certifications: [],
    };
  }
}

export const candidateExtractor = new CandidateExtractor();
