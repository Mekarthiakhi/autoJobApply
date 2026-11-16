import { Router } from 'express';
import { runWorkflow } from '../controllers/agentController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/run', authMiddleware, runWorkflow);

export default router;
