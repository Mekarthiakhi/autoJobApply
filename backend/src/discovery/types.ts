export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive' | 'unspecified';
export type EmploymentType = 'Full-Time' | 'Part-Time' | 'Contract' | 'Internship' | 'Temporary' | 'Other';
export type JobStatus = 'new' | 'active' | 'stale' | 'expired';
export type JobPlatform = 'linkedin' | 'indeed' | 'glassdoor' | 'naukri' | 'career_page' | 'other';

export interface NormalizedSalary {
  raw?: string;
  min?: number;
  max?: number;
  currency?: string;
  period?: 'yearly' | 'monthly' | 'hourly';
}

export interface NormalizedJob {
  id?: string;
  title: string;
  companyName: string;
  location: string;
  isRemote: boolean;
  salary: NormalizedSalary;
  experienceLevel: ExperienceLevel;
  employmentType: EmploymentType;
  requiredSkills: string[];
  jobDescription: string;
  applyUrl: string;
  canonicalUrl: string;
  source: JobPlatform;
  externalId: string;
  postedDate: string;
  discoveredAt: string;
  lastSeenAt: string;
  status: JobStatus;
}

export interface JobFilterCriteria {
  keyword?: string;
  location?: string;
  remoteOnly?: boolean;
  minSalary?: number;
  experienceLevel?: ExperienceLevel | string;
  employmentType?: EmploymentType | string;
  source?: JobPlatform | string;
  status?: JobStatus | string;
  minMatchScore?: number;
  profileMatchedOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface ScoreExplanationFactor {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  reason: string;
}

export interface CandidateScoringProfile {
  skills: string[];
  experienceYears?: number;
  experienceLevel?: ExperienceLevel;
  targetRoles?: string[];
  targetLocations?: string[];
  prefersRemote?: boolean;
  minSalary?: number;
  preferredEmploymentType?: EmploymentType;
}

export interface ExplainableScoreResult {
  totalScore: number; // 0-100
  recommendation: 'Apply' | 'Maybe' | 'Skip';
  factors: ScoreExplanationFactor[];
  summary: string;
}

export interface BotChallengeResult {
  isChallenged: boolean;
  challengeType?: 'cloudflare_turnstile' | 'recaptcha' | 'hcaptcha' | 'authwall' | 'otp' | 'unknown';
  details?: string;
}

