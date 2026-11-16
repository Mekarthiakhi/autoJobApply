export type WorkflowState =
  | 'IDLE'
  | 'PLANNING'
  | 'DISCOVERING'
  | 'DEDUPLICATING'
  | 'RANKING'
  | 'INSPECTING'
  | 'DRAFTING'
  | 'AWAITING_HUMAN_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUBMITTING'
  | 'COMPLETED'
  | 'FAILED';

export type AgentExecutionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'AWAITING_HUMAN_APPROVAL'
  | 'CANCELLED';

export enum AgentResponsibility {
  JOB_DISCOVERY = 'JOB_DISCOVERY',
  JOB_DEDUPLICATION = 'JOB_DEDUPLICATION',
  JOB_RANKING = 'JOB_RANKING',
  COMPANY_RESEARCH = 'COMPANY_RESEARCH',
  RESUME_ANALYSIS = 'RESUME_ANALYSIS',
  RESUME_OPTIMIZATION = 'RESUME_OPTIMIZATION',
  COVER_LETTER = 'COVER_LETTER',
  APPLICATION_PREPARATION = 'APPLICATION_PREPARATION',
  APPLICATION_REVIEW = 'APPLICATION_REVIEW',
  BROWSER_AUTOMATION = 'BROWSER_AUTOMATION',
  NOTIFICATION = 'NOTIFICATION',
  ANALYTICS = 'ANALYTICS',
}

export interface AgentContext {
  userId: string;
  workflowId: string;
  correlationId: string;
  dryRun?: boolean;
}

export interface AgentResult<T = any> {
  status: AgentExecutionStatus;
  data?: T;
  error?: string;
  durationMs: number;
  retriesAttempted: number;
  provider?: string;
  model?: string;
}

export interface AgentContract<TInput = any, TOutput = any> {
  readonly name: string;
  readonly responsibility: AgentResponsibility;
  execute(input: TInput, ctx: AgentContext): Promise<AgentResult<TOutput>>;
}

// -------------------------------------------------------------
// Typed Schemas for Each Responsibility
// -------------------------------------------------------------

// 1. Job Discovery
export interface JobDiscoveryInput {
  targetRoles: string[];
  targetLocations: string[];
  platforms: string[];
  limitPerPlatform?: number;
  mode?: 'live' | 'test' | 'simulation';
  fastTest?: boolean;
}
export interface DiscoveredJobRaw {
  title: string;
  company_name: string;
  location?: string;
  salary?: string;
  experience_level?: string;
  required_skills?: string[];
  job_description?: string;
  apply_url: string;
  source: string;
  external_id: string;
}
export interface JobDiscoveryOutput {
  discoveredCount: number;
  newJobsSaved: number;
  jobIds: string[];
}

// 2. Job Deduplication & Normalization
export interface DeduplicationInput {
  userId: string;
  jobIds: string[];
}
export interface DeduplicationOutput {
  totalChecked: number;
  duplicateCount: number;
  uniqueJobIds: string[];
}

// 3. Job Ranking and Matching
export interface JobRankingInput {
  userId: string;
  resumeText: string;
  job: {
    id: string;
    title: string;
    description: string;
    requiredSkills?: string[];
    location?: string;
    salary?: string;
  };
  threshold?: number;
}
export interface JobRankingOutput {
  jobId: string;
  score: number;
  recommendation: 'Apply' | 'Maybe' | 'Skip';
  matchingSkills: string[];
  missingSkills: string[];
  strengths: string[];
  breakdown: {
    skillMatch: number;
    titleMatch: number;
    locationMatch: number;
    salaryMatch: number;
  };
  meetsThreshold: boolean;
}

// 4. Company Research & Browser Inspection
export interface BrowserInspectionInput {
  jobId: string;
  applyUrl: string;
  timeoutMs?: number;
}
export interface BrowserInspectionOutput {
  jobId: string;
  pageTitle: string;
  screenshotPath: string | null;
  scrapedQuestions: string[];
  hasLoginWall: boolean;
  warnings: string[];
}

// 5. Resume Analysis
export interface ResumeAnalysisInput {
  textContent: string;
}
export interface ResumeAnalysisOutput {
  skills: string[];
  experience: string;
  education: string;
  keywords: string[];
}

// 6. Resume Optimization
export interface ResumeOptimizationInput {
  resumeContent: string;
  jobDescription: string;
}
export interface ResumeOptimizationOutput {
  ats_score: number;
  missing_keywords: string[];
  skills_to_improve: string[];
  grammar_suggestions: string[];
  experience_gaps: string[];
  projects_to_add: string[];
}

// 7. Cover Letter Drafting
export interface CoverLetterInput {
  userId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  resumeText: string;
  resumeVersionId?: string | null;
}
export interface CoverLetterOutput {
  coverLetterId?: string;
  content: string;
  wordCount: number;
}

// 8. Application Preparation
export interface ApplicationPreparationInput {
  userId: string;
  jobId: string;
  resumeVersionId: string | null;
  coverLetterId?: string | null;
  matchScore: number;
  screenshotPath?: string | null;
  warnings: string[];
  scrapedQuestions: string[];
}
export interface ApplicationPreparationOutput {
  applicationId: string;
  status: 'pending';
  reviewStatus: 'pending';
  queuedAt: string;
}

// 9. Application Review
export interface ApplicationReviewInput {
  userId: string;
  applicationId: string;
  action: 'approve' | 'reject';
  notes?: string;
  explicitUserConfirmation: boolean;
}
export interface ApplicationReviewOutput {
  applicationId: string;
  status: 'approved' | 'rejected';
  reviewStatus: 'approved' | 'rejected';
  decidedAt: string;
}

// 10. Notification
export interface NotificationInput {
  userId: string;
  type: 'job_alert' | 'daily_summary' | 'review_needed';
  recipientEmail?: string;
  telegramChatId?: string;
  payload: Record<string, any>;
}
export interface NotificationOutput {
  emailSent: boolean;
  telegramSent: boolean;
  timestamp: string;
}

// 11. Analytics & Reporting
export interface AnalyticsInput {
  userId: string;
}
export interface AnalyticsOutput {
  totalApplications: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  interviews: number;
  offers: number;
  conversionRate: number;
}

