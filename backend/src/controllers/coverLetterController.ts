import { Request, Response } from 'express';
import { coverLetterAgent } from '../services/coverLetterAgent.js';
import { CoverLetterRepository } from '../repositories/coverLetterRepository.js';
import { ResumeVersionRepository } from '../repositories/resumeVersionRepository.js';
import { JobRepository } from '../repositories/jobRepository.js';
import { AppError } from '../middleware/errorHandler.js';

const coverLetterRepository = new CoverLetterRepository();
const resumeVersionRepository = new ResumeVersionRepository();
const jobRepository = new JobRepository();

export async function generateCoverLetter(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { jobId, resumeVersionId } = req.body;
    if (!jobId) throw new AppError(400, 'jobId is required');

    const job = await jobRepository.findById(jobId);
    if (!job) throw new AppError(404, 'Job not found');

    // Get resume content with strict tenant ownership validation at SQL layer
    let resumeContent = '';
    if (resumeVersionId) {
      const ownership = await resumeVersionRepository.checkOwnership(resumeVersionId, userId);
      if (ownership === 'NOT_FOUND') {
        throw new AppError(404, 'Resume version not found');
      }
      if (ownership === 'FORBIDDEN') {
        throw new AppError(403, 'Forbidden: You do not have permission to access this resume version');
      }
      const version = await resumeVersionRepository.findByIdForUser(resumeVersionId, userId);
      if (!version) {
        throw new AppError(404, 'Resume version not found');
      }
      resumeContent = version.text_content || '';
    } else {
      // Fall back to default resume version for the authenticated user
      const defaultVersion = await resumeVersionRepository.findDefault(userId);
      if (defaultVersion) {
        resumeContent = defaultVersion.text_content || '';
      }
    }

    if (!resumeContent) {
      throw new AppError(400, 'No resume content available. Please create a resume version first.');
    }

    const result = await coverLetterAgent.generate(
      userId,
      jobId,
      resumeVersionId || null,
      job.title,
      job.company_name,
      job.job_description || '',
      resumeContent,
    );

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to generate cover letter' });
    }
  }
}

export async function getCoverLetters(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const letters = await coverLetterRepository.findByUserId(userId);
    res.json(letters);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cover letters' });
  }
}

export async function getCoverLetter(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const letter = await coverLetterRepository.findById(id);
    if (!letter) throw new AppError(404, 'Cover letter not found');
    if (letter.user_id !== userId) throw new AppError(403, 'Forbidden');

    res.json(letter);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch cover letter' });
    }
  }
}

export async function updateCoverLetter(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const { content } = req.body;
    if (!content) throw new AppError(400, 'content is required');

    const existing = await coverLetterRepository.findById(id);
    if (!existing) throw new AppError(404, 'Cover letter not found');
    if (existing.user_id !== userId) throw new AppError(403, 'Forbidden');

    const updated = await coverLetterRepository.update(id, userId, content);
    if (!updated) throw new AppError(404, 'Cover letter not found or unauthorized');
    res.json(updated);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update cover letter' });
    }
  }
}

export async function deleteCoverLetter(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const existing = await coverLetterRepository.findById(id);
    if (!existing) throw new AppError(404, 'Cover letter not found');
    if (existing.user_id !== userId) throw new AppError(403, 'Forbidden');

    const deleted = await coverLetterRepository.delete(id, userId);
    if (!deleted) throw new AppError(404, 'Cover letter not found or unauthorized');

    res.json({ message: 'Cover letter deleted' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete cover letter' });
    }
  }
}
