import crypto from 'crypto';
import { ApplicationAnswer } from './types.js';

export class DraftHashManager {
  private readonly DEFAULT_APPROVAL_TTL_HOURS = 24;

  /**
   * Computes an immutable SHA-256 hash of the complete application draft.
   * If any answer, resume version, or cover letter changes, this hash changes.
   */
  computeDraftHash(draft: {
    jobId: string;
    resumeVersionId?: string | null;
    coverLetterId?: string | null;
    answers?: ApplicationAnswer[];
  }): string {
    const normalizedAnswers = (draft.answers || [])
      .map(a => ({
        q: (a.question || '').trim().toLowerCase(),
        ans: (a.answer || '').trim(),
      }))
      .sort((a, b) => a.q.localeCompare(b.q));

    const canonicalData = {
      jobId: draft.jobId,
      resumeVersionId: draft.resumeVersionId || null,
      coverLetterId: draft.coverLetterId || null,
      answers: normalizedAnswers,
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(canonicalData))
      .digest('hex');
  }

  /**
   * Generates approval expiration timestamp (default: 24 hours from now)
   */
  generateApprovalExpiry(ttlHours: number = this.DEFAULT_APPROVAL_TTL_HOURS): string {
    const expiry = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    return expiry.toISOString();
  }

  /**
   * Checks if an approval is still valid against the current draft and time
   */
  validateApproval(
    currentDraftHash: string,
    approvedDraftHash: string | null,
    approvalExpiresAt: string | null
  ): { isValid: boolean; reason?: string } {
    if (!approvedDraftHash) {
      return { isValid: false, reason: 'Application has not been granted explicit candidate approval.' };
    }

    if (currentDraftHash !== approvedDraftHash) {
      return {
        isValid: false,
        reason: 'Approval invalidated: The application draft, resume, or answers were modified after approval.',
      };
    }

    if (approvalExpiresAt) {
      const expiryTime = new Date(approvalExpiresAt).getTime();
      if (Date.now() > expiryTime) {
        return {
          isValid: false,
          reason: `Approval expired at ${approvalExpiresAt}. Applications must be re-approved after 24 hours for candidate safety.`,
        };
      }
    }

    return { isValid: true };
  }
}

export const draftHashManager = new DraftHashManager();

