import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { applyToJob, getApplications, updateApplicationStatus } from '../controllers/applicationController.js';

const router = Router();

router.post('/apply', authMiddleware, applyToJob);
router.get('/', authMiddleware, getApplications);
router.put('/:applicationId', authMiddleware, updateApplicationStatus);

export default router;
