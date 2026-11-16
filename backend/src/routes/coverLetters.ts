import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { generateCoverLetter, getCoverLetters, getCoverLetter, updateCoverLetter, deleteCoverLetter } from '../controllers/coverLetterController.js';

const router = Router();

router.post('/generate', authMiddleware, generateCoverLetter);
router.get('/', authMiddleware, getCoverLetters);
router.get('/:id', authMiddleware, getCoverLetter);
router.put('/:id', authMiddleware, updateCoverLetter);
router.delete('/:id', authMiddleware, deleteCoverLetter);

export default router;
