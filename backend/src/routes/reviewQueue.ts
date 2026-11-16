import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getPendingReviews,
  getReviewDetail,
  approveReview,
  approveAllReviews,
  rejectReview,
  verifyAnswers,
  updateDraft,
  verifySubmissionPreflight,
} from '../controllers/reviewQueueController.js';

const router = Router();

// Queue and bulk operations (approve-all blocked by policy)
router.get('/', authMiddleware, getPendingReviews);
router.post('/approve-all', authMiddleware, approveAllReviews);

// Individual application operations
router.get('/:id', authMiddleware, getReviewDetail);
router.post('/:id/verify', authMiddleware, verifyAnswers);
router.put('/:id/draft', authMiddleware, updateDraft);
router.post('/:id/approve', authMiddleware, approveReview);
router.post('/:id/reject', authMiddleware, rejectReview);
router.get('/:id/verify-submission', authMiddleware, verifySubmissionPreflight);

export default router;
