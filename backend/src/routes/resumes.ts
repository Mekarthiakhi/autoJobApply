import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import { uploadResume, getResume } from '../controllers/resumeController.js';
import { env } from '../config/env.js';

const router = Router();

// Configure multer memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: env.RESUME_MAX_SIZE || 5 * 1024 * 1024, // default 5MB
  },
});

router.post('/upload', authMiddleware, upload.single('resume'), uploadResume);
router.get('/', authMiddleware, getResume);

export default router;
