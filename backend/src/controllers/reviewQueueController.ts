import { Request, Response } from 'express';
import { reviewAgent } from '../services/reviewAgent.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getPendingReviews(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const reviews = await reviewAgent.getPendingReviews(userId);
    const parsedReviews = reviews.map(r => ({
      ...r,
      warnings: r.warnings ? JSON.parse(r.warnings) : [],
      scraped_questions: r.scraped_questions ? JSON.parse(r.scraped_questions) : [],
      application_answers: r.application_answers ? JSON.parse(r.application_answers) : [],
      missing_fields: r.missing_fields ? JSON.parse(r.missing_fields) : [],
      uncertain_fields: r.uncertain_fields ? JSON.parse(r.uncertain_fields) : [],
    }));

    res.json(parsedReviews);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch review queue' });
    }
  }
}

export async function getReviewDetail(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    if (!id) throw new AppError(400, 'Review ID required');

    const review = await reviewAgent.getReviewDetail(id);
    if (!review) throw new AppError(404, 'Review not found');

    // Verify ownership
    if ((review as any).user_id !== userId) throw new AppError(403, 'Forbidden');

    res.json({
      ...review,
      warnings: review.warnings ? JSON.parse(review.warnings) : [],
      scraped_questions: review.scraped_questions ? JSON.parse(review.scraped_questions) : [],
      application_answers: review.application_answers ? JSON.parse(review.application_answers) : [],
      missing_fields: review.missing_fields ? JSON.parse(review.missing_fields) : [],
      uncertain_fields: review.uncertain_fields ? JSON.parse(review.uncertain_fields) : [],
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch review detail' });
    }
  }
}

/**
 * Candidate verifies proposed answers for an application
 */
export async function verifyAnswers(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const { answers } = req.body;
    if (!id) throw new AppError(400, 'Review ID required');
    if (!answers || !Array.isArray(answers)) throw new AppError(400, 'Array of answers required');

    await reviewAgent.verifyAnswers(userId, id, answers);
    res.json({ message: 'Application answers verified successfully' });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message || 'Failed to verify application answers' });
    }
  }
}

/**
 * Update application draft (modifies resume version, cover letter, or notes)
 * Invalidates any prior approval.
 */
export async function updateDraft(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const { resumeVersionId, coverLetterId, notes } = req.body;
    if (!id) throw new AppError(400, 'Review ID required');

    await reviewAgent.updateDraft(userId, id, { resumeVersionId, coverLetterId, notes });
    res.json({ message: 'Application draft updated. Any previous approval has been invalidated.' });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message || 'Failed to update application draft' });
    }
  }
}

/**
 * Approve an individual application.
 * Requires verified answers; binds approval to draft hash with 24h expiration.
 */
export async function approveReview(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    if (!id) throw new AppError(400, 'Review ID required');

    const { verifiedAnswers, notes } = req.body || {};

    const approvalResult = await reviewAgent.approve(userId, id, { verifiedAnswers, notes });
    res.json({
      message: 'Application approved with explicit candidate authorization',
      ...approvalResult,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(400).json({ error: error.message || 'Failed to approve application' });
    }
  }
}

/**
 * Bulk approval authorized by candidate confirmation.
 */
export async function approveAllReviews(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { confirmed, notes } = req.body || {};
    if (confirmed !== true) {
      throw new AppError(400, 'Explicit confirmation required for bulk application approval (body: { confirmed: true })');
    }

    const result = await reviewAgent.approveAll(userId, { confirmed: true, notes });

    res.json({
      message: `Successfully authorized and submitted all ${result.approvedCount} application drafts!`,
      ...result,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(400).json({ error: error.message || 'Failed to approve all applications' });
    }
  }
}

/**
 * Reject an application
 */
export async function rejectReview(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const { reason } = req.body;
    if (!id) throw new AppError(400, 'Review ID required');

    await reviewAgent.reject(userId, id, reason);
    res.json({ message: 'Application rejected' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to reject application' });
    }
  }
}

/**
 * Pre-submission backend verification check
 */
export async function verifySubmissionPreflight(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    if (!id) throw new AppError(400, 'Review ID required');

    const result = await reviewAgent.verifyApprovalBeforeSubmission(userId, id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Preflight verification check failed' });
  }
}
