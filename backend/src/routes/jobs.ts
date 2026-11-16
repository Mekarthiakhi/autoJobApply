import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getJobs,
  getJobDetails,
  searchJobs,
  getExplainableScore,
  createSavedSearch,
  getSavedSearches,
  deleteSavedSearch,
  runSavedSearch,
} from '../controllers/jobController.js';

const router = Router();

// Saved searches (must be before /:jobId)
router.post('/saved-searches', authMiddleware, createSavedSearch);
router.get('/saved-searches', authMiddleware, getSavedSearches);
router.delete('/saved-searches/:id', authMiddleware, deleteSavedSearch);
router.post('/saved-searches/:id/run', authMiddleware, runSavedSearch);

// Search & Feed
router.get('/', authMiddleware, getJobs);
router.post('/search', authMiddleware, searchJobs);

// Job details & explainable scoring
router.get('/:jobId', authMiddleware, getJobDetails);
router.get('/:jobId/score', authMiddleware, getExplainableScore);

export default router;
