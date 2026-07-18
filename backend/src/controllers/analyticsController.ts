import { Request, Response } from 'express';
import { getDatabase } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getAnalytics(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const sql = getDatabase();

    // Funnel Stats
    const funnelStats = await sql`
      SELECT 
        COUNT(*) as total_applied,
        COUNT(*) FILTER (WHERE status != 'pending' AND status != 'applied') as viewed,
        COUNT(*) FILTER (WHERE interview_scheduled = true OR status = 'interview') as interviews,
        COUNT(*) FILTER (WHERE offer_received = true OR status = 'offer') as offers
      FROM applications
      WHERE user_id = ${userId}
    `;

    const stats = funnelStats[0];

    const totalApplied = parseInt(stats.total_applied) || 0;
    const viewed = parseInt(stats.viewed) || 0;
    const interviews = parseInt(stats.interviews) || 0;
    const offers = parseInt(stats.offers) || 0;

    res.json({
      stats: {
        totalApplications: totalApplied,
        profilesViewed: viewed,
        messagesReceived: Math.floor(viewed * 0.4), // Mocked for now since messages aren't tracked
        interviews: interviews,
        offers: offers,
        responseRate: totalApplied > 0 ? (viewed / totalApplied) * 100 : 0,
        interviewRate: totalApplied > 0 ? (interviews / totalApplied) * 100 : 0,
        offerRate: totalApplied > 0 ? (offers / totalApplied) * 100 : 0,
      }
    });

  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}
