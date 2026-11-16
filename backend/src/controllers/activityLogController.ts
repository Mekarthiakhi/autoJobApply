import { Request, Response } from 'express';
import { ActivityLogRepository } from '../repositories/activityLogRepository.js';
import { AppError } from '../middleware/errorHandler.js';

const activityLogRepository = new ActivityLogRepository();

export async function getActivityLogs(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { action, status, startDate, endDate, limit, page } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const offset = (pageNum - 1) * limitNum;

    const filterOptions = {
      action: action as string | undefined,
      status: status as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    };

    const [logs, total] = await Promise.all([
      activityLogRepository.findByUserId(userId, {
        ...filterOptions,
        limit: limitNum,
        offset,
      }),
      activityLogRepository.countByUserId(userId, filterOptions),
    ]);

    // If page query is explicitly supplied, return paginated object; otherwise array for backward compatibility
    if (page !== undefined || req.headers['accept']?.includes('application/json+paginated')) {
      res.json({
        logs,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } else {
      res.json(logs);
    }
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
  }
}

export async function getActivityStats(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const stats = await activityLogRepository.getStats(userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity stats' });
  }
}
