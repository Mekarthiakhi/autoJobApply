import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  applyToJob,
  batchApplyToJobs,
  getApplications,
  updateApplicationStatus,
  verifyAndSubmitApplication,
  confirmManualApplied,
  sendWhatsAppSummary,
  checkCompanyReplies,
  sendTestReport,
} from '../controllers/applicationController.js';

const router = Router();

router.post('/apply', authMiddleware, applyToJob);
router.post('/batch-apply', authMiddleware, batchApplyToJobs);
router.post('/notify-whatsapp', authMiddleware, sendWhatsAppSummary);
router.post('/check-replies', authMiddleware, checkCompanyReplies);
router.post('/send-test-report', authMiddleware, sendTestReport);
router.get('/', authMiddleware, getApplications);
router.put('/:applicationId', authMiddleware, updateApplicationStatus);
router.post('/:applicationId/verify-submit', authMiddleware, verifyAndSubmitApplication);
router.post('/:applicationId/confirm-applied', authMiddleware, confirmManualApplied);

export default router;
