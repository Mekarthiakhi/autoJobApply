import { Request, Response } from 'express';
import { UserRepository } from '../repositories/userRepository.js';
import { hashPassword, comparePassword } from '../utils/encryption.js';
import { generateToken } from '../utils/jwt.js';
import { AppError } from '../middleware/errorHandler.js';
import { getDatabase } from '../config/database.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../utils/email.js';
import crypto from 'crypto';

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
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    const user = await userRepository.create(email, passwordHash, fullName, verificationToken);

    // Send the verification email (logs mock in development/staging)
    await sendVerificationEmail(user.email, user.full_name, verificationToken);

    const autoVerify = process.env.NODE_ENV !== 'production' || !process.env.RESEND_API_KEY;
    if (autoVerify) {
      await userRepository.update(user.id, { is_verified: true, verification_token: null });
      user.is_verified = true;
    }

    const token = generateToken({ userId: user.id, email: user.email });

    res.status(201).json({
      message: autoVerify
        ? 'Registration successful.'
        : 'Registration successful. Please check your email to verify your account.',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        isVerified: user.is_verified,
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Registration failed', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
}

export async function verifyEmail(req: Request, res: Response) {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      throw new AppError(400, 'Verification token is required');
    }

    const user = await userRepository.findByVerificationToken(token);
    if (!user) {
      throw new AppError(400, 'Invalid or expired verification token');
    }

    await userRepository.update(user.id, {
      is_verified: true,
      verification_token: null
    });

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Email verification failed' });
    }
  }
}

export async function resendVerification(req: Request, res: Response) {
  try {
    const { email } = req.body;
    
    if (!email) {
      throw new AppError(400, 'Email is required');
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (user.is_verified) {
      throw new AppError(400, 'User is already verified');
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    await userRepository.update(user.id, {
      verification_token: verificationToken
    });

    await sendVerificationEmail(user.email, user.full_name, verificationToken);

    res.json({ message: 'Verification email resent successfully. Please check your inbox.' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Resend verification failed', error);
      res.status(500).json({ error: 'Failed to resend verification email' });
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

    if (!user.is_verified) {
      const autoVerify = process.env.NODE_ENV !== 'production' || !process.env.RESEND_API_KEY;
      if (autoVerify) {
        await userRepository.update(user.id, { is_verified: true, verification_token: null });
        user.is_verified = true;
      } else {
        throw new AppError(403, 'Please verify your email before logging in');
      }
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

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    
    if (!email) {
      throw new AppError(400, 'Email is required');
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Return success even if user not found to prevent email enumeration
      return res.json({ message: 'If an account exists, a password reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
    
    await userRepository.update(user.id, {
      reset_token: resetToken,
      reset_token_expires: resetTokenExpires
    } as any);

    await sendPasswordResetEmail(user.email, user.full_name, resetToken);

    res.json({ message: 'If an account exists, a password reset link has been sent.' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Forgot password failed', error);
      res.status(500).json({ error: 'Failed to process forgot password request' });
    }
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      throw new AppError(400, 'Token and new password are required');
    }

    if (password.length < 6) {
      throw new AppError(400, 'Password must be at least 6 characters long');
    }

    const user = await userRepository.findByResetToken(token);
    if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
      throw new AppError(400, 'Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(password);

    await userRepository.update(user.id, {
      password_hash: passwordHash,
      reset_token: null,
      reset_token_expires: null
    } as any);

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Reset password failed', error);
      res.status(500).json({ error: 'Failed to reset password' });
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

    const db = await getDatabase();
    const settings = await db.get(
      `SELECT telegram_enabled, telegram_chat_id FROM automation_settings WHERE user_id = ?`,
      [userId]
    );

    res.json({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      preferredLocations: user.preferred_locations,
      employmentType: user.employment_type,
      minMatchScore: user.min_match_score,
      isVerified: user.is_verified,
      telegramEnabled: settings?.telegram_enabled === 1,
      telegramChatId: settings?.telegram_chat_id || '',
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

    const db = await getDatabase();
    const tEnabled = telegramEnabled ? 1 : 0;
    
    await db.run(
      `INSERT INTO automation_settings (user_id, telegram_enabled, telegram_chat_id)
       VALUES (?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET
         telegram_enabled = excluded.telegram_enabled,
         telegram_chat_id = excluded.telegram_chat_id,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, tEnabled, telegramChatId || '']
    );

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
