import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getActivityLogs, getActivityStats } from '../controllers/activityLogController.js';

const router = Router();

router.get('/', authMiddleware, getActivityLogs);
router.get('/stats', authMiddleware, getActivityStats);

export default router;
