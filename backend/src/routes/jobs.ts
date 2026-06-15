import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getJobs, getJobDetails, searchJobs } from '../controllers/jobController.js';

const router = Router();

router.get('/', authMiddleware, getJobs);
router.get('/:jobId', authMiddleware, getJobDetails);
router.post('/search', authMiddleware, searchJobs);

export default router;
