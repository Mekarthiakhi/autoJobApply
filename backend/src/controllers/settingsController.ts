import { Request, Response } from 'express';
import { SettingsRepository } from '../repositories/settingsRepository.js';
import { AppError } from '../middleware/errorHandler.js';

const settingsRepository = new SettingsRepository();

export async function getSettings(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    let settings = await settingsRepository.findByUserId(userId);
    
    if (!settings) {
      settings = await settingsRepository.upsert(userId, {});
    }

    // Parse JSON arrays for the frontend
    const parsedSettings = {
      ...settings,
      target_roles: parseJsonArray(settings.target_roles),
      target_locations: parseJsonArray(settings.target_locations),
      preferred_platforms: parseJsonArray(settings.preferred_platforms),
    };

    res.json(parsedSettings);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }
}

export async function updateSettings(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const updated = await settingsRepository.upsert(userId, req.body);

    const parsedSettings = {
      ...updated,
      target_roles: parseJsonArray(updated.target_roles),
      target_locations: parseJsonArray(updated.target_locations),
      preferred_platforms: parseJsonArray(updated.preferred_platforms),
    };

    res.json(parsedSettings);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  }
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
