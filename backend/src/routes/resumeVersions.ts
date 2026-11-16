import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import { env } from '../config/env.js';
import {
  getResumeVersions,
  getResumeVersion,
  createResumeVersion,
  updateResumeVersion,
  deleteResumeVersion,
  setDefaultResumeVersion,
  parseResume,
  calculateATSScore,
  generateTailoredDraft,
  validateResume,
  cloneResumeVersion,
  exportPDF,
  exportHTML,
  getVersionApplications,
} from '../controllers/resumeVersionController.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.RESUME_MAX_SIZE || 5 * 1024 * 1024 },
});

// Non-parameterized routes first
router.get('/', authMiddleware, getResumeVersions);
router.post('/parse', authMiddleware, upload.single('resume'), parseResume);
router.post('/', authMiddleware, upload.single('resume'), createResumeVersion);

// Parameterized routes
router.get('/:id', authMiddleware, getResumeVersion);
router.put('/:id', authMiddleware, updateResumeVersion);
router.delete('/:id', authMiddleware, deleteResumeVersion);
router.post('/:id/default', authMiddleware, setDefaultResumeVersion);
router.post('/:id/ats-score', authMiddleware, calculateATSScore);
router.post('/:id/tailor', authMiddleware, generateTailoredDraft);
router.post('/:id/validate', authMiddleware, validateResume);
router.post('/:id/clone', authMiddleware, cloneResumeVersion);
router.get('/:id/export/pdf', authMiddleware, exportPDF);
router.get('/:id/export/html', authMiddleware, exportHTML);
router.get('/:id/applications', authMiddleware, getVersionApplications);

export default router;
