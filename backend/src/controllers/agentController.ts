import { Request, Response } from 'express';
import { workflowOrchestrator } from '../services/WorkflowOrchestrator.js';
import { AppError } from '../middleware/errorHandler.js';

export async function runWorkflow(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    // Start asynchronously so we don't block the HTTP response
    workflowOrchestrator.runWorkflow(userId).catch(err => {
      console.error('Background workflow error:', err);
    });

    res.json({ message: 'Workflow started in the background. Check your Activity Logs and Review Queue shortly.' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to start workflow' });
    }
  }
}
