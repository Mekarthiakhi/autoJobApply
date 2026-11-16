export interface CandidateBasics {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  summary?: string;
}

export interface CategorizedSkills {
  languages: string[];
  frameworks: string[];
  cloudDevOps: string[];
  databases: string[];
  tools: string[];
  softSkills: string[];
  all: string[];
}

export interface WorkExperienceItem {
  id: string;
  company: string;
  role: string;
  location?: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  highlights: string[];
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  graduationYear?: string;
  gpa?: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  link?: string;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  issueDate?: string;
}

export interface StructuredResume {
  basics: CandidateBasics;
  skills: CategorizedSkills;
  experience: WorkExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
}

export interface ATSDimensionScore {
  score: number;
  maxScore: number;
  details: string;
}

export interface ATSScoreBreakdown {
  keywordMatch: ATSDimensionScore;
  experienceRelevance: ATSDimensionScore;
  formattingParseability: ATSDimensionScore;
  educationRelevance: ATSDimensionScore;
  quantifiableImpact: ATSDimensionScore;
}

export interface ImprovementSuggestion {
  section: 'summary' | 'experience' | 'skills' | 'projects' | 'education' | 'formatting';
  type: 'action_verb' | 'quantify_metric' | 'highlight_skill' | 'clarify_term' | 'reorder';
  originalText?: string;
  suggestedChange: string;
  reason: string;
  groundedInFact: boolean;
}

export interface ATSAssessment {
  overallScore: number;
  matchScore: number;
  breakdown: ATSScoreBreakdown;
  matchingKeywords: string[];
  missingKeywords: string[];
  experienceGaps: string[];
  formattingIssues: string[];
  suggestions: ImprovementSuggestion[];
  explainableSummary: string;
}

export interface TailoredResumeDraft {
  id: string;
  targetJobId: string;
  parentVersionId: string;
  jobTitle: string;
  companyName: string;
  tailoredSummary: string;
  tailoredSkills: CategorizedSkills;
  tailoredExperience: WorkExperienceItem[];
  tailoredProjects: ProjectItem[];
  fullStructuredData: StructuredResume;
  atsScoreExpected: number;
  optimizationsApplied: string[];
  isReviewable: boolean;
}

export interface DocumentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  charCount: number;
  wordCount: number;
  estimatedPageCount: number;
  missingSections: string[];
}

