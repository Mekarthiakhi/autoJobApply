import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getSettings, updateSettings } from '../controllers/settingsController.js';

const router = Router();

router.get('/', authMiddleware, getSettings);
router.put('/', authMiddleware, updateSettings);

export default router;
