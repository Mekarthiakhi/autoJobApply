import { Request, Response } from 'express';
import { ApplicationRepository } from '../repositories/applicationRepository.js';
import { AppError } from '../middleware/errorHandler.js';

const applicationRepository = new ApplicationRepository();

export async function applyToJob(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { jobId } = req.body;
    if (!jobId) throw new AppError(400, 'Job ID required');

    const application = await applicationRepository.create(userId, jobId);

    res.status(201).json({
      message: 'Application submitted',
      application,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to submit application' });
    }
  }
}

export async function getApplications(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const applications = await applicationRepository.findByUserId(userId);

    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
}

export async function updateApplicationStatus(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { applicationId } = req.params;
    const { status } = req.body;

    if (!status) throw new AppError(400, 'Status required');

    const application = await applicationRepository.updateStatus(applicationId, status);

    res.json(application);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update application' });
    }
  }
}
