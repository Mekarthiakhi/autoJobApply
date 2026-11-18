import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  applyToJob,
  getApplications,
  updateApplicationStatus,
  verifyAndSubmitApplication,
  confirmManualApplied,
  sendWhatsAppSummary,
} from '../controllers/applicationController.js';

const router = Router();

router.post('/apply', authMiddleware, applyToJob);
router.post('/notify-whatsapp', authMiddleware, sendWhatsAppSummary);
router.get('/', authMiddleware, getApplications);
router.put('/:applicationId', authMiddleware, updateApplicationStatus);
router.post('/:applicationId/verify-submit', authMiddleware, verifyAndSubmitApplication);
router.post('/:applicationId/confirm-applied', authMiddleware, confirmManualApplied);

export default router;
