import { Request, Response } from 'express';
import { loggerAgent } from '../services/loggerAgent.js';
import { AppError } from '../middleware/errorHandler.js';

export async function exportApplicationsCsv(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const csv = await loggerAgent.exportApplicationsCsv(userId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="applications-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to export applications' });
    }
  }
}

export async function exportApplicationsXlsx(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const buffer = await loggerAgent.exportApplicationsXlsx(userId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="applications-${Date.now()}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to export applications' });
    }
  }
}

export async function exportActivityLogsCsv(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const csv = await loggerAgent.exportActivityLogsCsv(userId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="activity-logs-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to export activity logs' });
    }
  }
}
