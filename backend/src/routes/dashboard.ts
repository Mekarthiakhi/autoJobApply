import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getDashboard, getCardDetails } from '../controllers/dashboardController.js';

const router = Router();

router.get('/card-items', authMiddleware, getCardDetails);
router.get('/', authMiddleware, getDashboard);

export default router;
