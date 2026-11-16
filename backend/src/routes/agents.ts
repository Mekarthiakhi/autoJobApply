import { Router } from 'express';
import {
  runWorkflow,
  getRunStatus,
  listAgents,
  testAsUser,
  createCustomAgent,
} from '../controllers/agentController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Informational and status endpoints (accessible directly via GET)
router.get('/run', getRunStatus);
router.get('/status', getRunStatus);

// Authenticated agent operations
router.post('/run', authMiddleware, runWorkflow);
router.get('/list', authMiddleware, listAgents);
router.post('/test-as-user', authMiddleware, testAsUser);
router.post('/create', authMiddleware, createCustomAgent);

export default router;
