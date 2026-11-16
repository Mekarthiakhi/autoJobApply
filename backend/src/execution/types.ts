export enum ApplicationStage {
  DISCOVERED = 'DISCOVERED',
  RANKED = 'RANKED',
  DRAFTING = 'DRAFTING',
  READY_FOR_REVIEW = 'READY_FOR_REVIEW',
  APPROVED = 'APPROVED',
  SUBMITTING = 'SUBMITTING',
  SUBMITTED = 'SUBMITTED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
  NEEDS_CANDIDATE_INPUT = 'NEEDS_CANDIDATE_INPUT',
}

export type FieldSource = 'profile' | 'resume' | 'inferred' | 'candidate';

export interface ApplicationAnswer {
  questionId: string;
  question: string;
  answer: string;
  fieldType?: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'file';
  source: FieldSource;
  isConfident: boolean;
  confidenceScore: number; // 0.0 to 1.0
  requiresVerification: boolean;
  isLegalOrConsentCheckbox?: boolean;
}

export interface MissingFieldItem {
  field: string;
  reason: string;
  prompt: string;
}

export interface UncertainFieldItem {
  field: string;
  confidence: number;
  suggestedAnswer?: string;
  reason: string;
}

export interface ApprovalPayload {
  verifiedAnswers: boolean;
  notes?: string;
}

export interface SubmissionVerificationResult {
  isAuthorized: boolean;
  error?: string;
  rejectionCode?:
    | 'UNAUTHORIZED'
    | 'NOT_APPROVED'
    | 'DRAFT_CHANGED'
    | 'APPROVAL_EXPIRED'
    | 'ALREADY_SUBMITTED'
    | 'UNVERIFIED_ANSWERS';
  currentDraftHash: string;
  approvedDraftHash?: string;
  expiresAt?: string;
}

export interface ControlledFormPreparationResult {
  status: 'PREPARED_STOPPED_BEFORE_SUBMIT' | 'PAUSED_FOR_USER' | 'FAILED';
  filledFieldsCount: number;
  unfilledFields: string[];
  encounteredChallenges: string[];
  screenshotPath: string | null;
  requiresCandidateAction: boolean;
  reason?: string;
}

