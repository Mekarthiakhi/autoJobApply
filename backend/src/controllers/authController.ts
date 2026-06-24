import { Request, Response } from 'express';
import { UserRepository } from '../repositories/userRepository.js';
import { hashPassword, comparePassword } from '../utils/encryption.js';
import { generateToken } from '../utils/jwt.js';
import { AppError } from '../middleware/errorHandler.js';
import { getDatabase } from '../config/database.js';

const userRepository = new UserRepository();

export async function register(req: Request, res: Response) {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      throw new AppError(400, 'Email, password, and full name are required');
    }

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError(400, 'User already exists');
    }

    const passwordHash = await hashPassword(password);
    const user = await userRepository.create(email, passwordHash, fullName);

    const token = generateToken({ userId: user.id, email: user.email });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
      },
      token,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(400, 'Email and password are required');
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    const token = generateToken({ userId: user.id, email: user.email });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
      },
      token,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Login failed' });
    }
  }
}

export async function getProfile(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const sql = getDatabase();
    const settingsResult = await sql`
      SELECT telegram_enabled, telegram_chat_id 
      FROM automation_settings 
      WHERE user_id = ${userId}
    `;
    const settings = settingsResult[0] || { telegram_enabled: false, telegram_chat_id: '' };

    res.json({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      preferredLocations: user.preferred_locations,
      employmentType: user.employment_type,
      minMatchScore: user.min_match_score,
      telegramEnabled: settings.telegram_enabled,
      telegramChatId: settings.telegram_chat_id,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }
}

export async function updateProfile(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const { preferredLocations, employmentType, minMatchScore, telegramEnabled, telegramChatId } = req.body;

    const user = await userRepository.update(userId, {
      preferred_locations: preferredLocations,
      employment_type: employmentType,
      min_match_score: minMatchScore,
    } as any);

    const sql = getDatabase();
    await sql`
      INSERT INTO automation_settings (user_id, telegram_enabled, telegram_chat_id)
      VALUES (${userId}, ${telegramEnabled || false}, ${telegramChatId || ''})
      ON CONFLICT (user_id) DO UPDATE SET
        telegram_enabled = EXCLUDED.telegram_enabled,
        telegram_chat_id = EXCLUDED.telegram_chat_id,
        updated_at = NOW()
    `;

    res.json({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      preferredLocations: user.preferred_locations,
      employmentType: user.employment_type,
      minMatchScore: user.min_match_score,
      telegramEnabled: telegramEnabled || false,
      telegramChatId: telegramChatId || '',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
}
