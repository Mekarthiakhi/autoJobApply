import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { exportApplicationsCsv, exportApplicationsXlsx, exportActivityLogsCsv } from '../controllers/exportController.js';

const router = Router();

router.get('/applications/csv', authMiddleware, exportApplicationsCsv);
router.get('/applications/xlsx', authMiddleware, exportApplicationsXlsx);
router.get('/activity-logs/csv', authMiddleware, exportActivityLogsCsv);

export default router;
