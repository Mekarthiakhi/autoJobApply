import { Request, Response } from 'express';
import { UserRepository } from '../repositories/userRepository.js';
import { hashPassword, comparePassword } from '../utils/encryption.js';
import { generateToken } from '../utils/jwt.js';
import { AppError } from '../middleware/errorHandler.js';
import { getDatabase } from '../config/database.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../utils/email.js';
import { extractMobilePhoneFromResume, normalizePhoneNumber } from '../utils/phoneExtractor.js';
import crypto from 'crypto';

const userRepository = new UserRepository();

export async function register(req: Request, res: Response) {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      throw new AppError(400, 'Email, password, and full name are required');
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await userRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new AppError(400, 'An account with this email already exists');
    }

    const passwordHash = await hashPassword(password);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    const user = await userRepository.create(normalizedEmail, passwordHash, fullName, verificationToken);

    // Send the verification email if email provider is configured & verified
    const emailResult = await sendVerificationEmail(user.email, user.full_name, verificationToken);

    const autoVerify = process.env.REQUIRE_EMAIL_VERIFICATION !== 'true' || !emailResult.sent;
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
      const autoVerify = process.env.REQUIRE_EMAIL_VERIFICATION !== 'true';
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
    
    if (!email || !String(email).trim()) {
      throw new AppError(400, 'Email is required');
    }

    const user = await userRepository.findByEmail(String(email).trim());
    if (!user) {
      throw new AppError(404, 'No account found with this email address.');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
    
    await userRepository.update(user.id, {
      reset_token: resetToken,
      reset_token_expires: resetTokenExpires
    } as any);

    const emailResult = await sendPasswordResetEmail(user.email, user.full_name, resetToken);

    if (!emailResult.sent) {
      throw new AppError(
        502,
        `Password reset email could not be delivered: ${emailResult.error || 'Email provider rejected the request.'}`
      );
    }

    res.json({ message: 'A password reset link has been sent to your email. Please check your inbox.' });
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
      `SELECT telegram_enabled, telegram_chat_id, email_notifications, auto_apply_enabled,
              auto_apply_interval_hours, last_auto_apply_run_at,
              whatsapp_enabled, whatsapp_phone, whatsapp_api_key,
              imap_enabled, imap_email, imap_password, imap_host
       FROM automation_settings WHERE user_id = ?`,
      [userId]
    );

    let whatsappPhone = settings?.whatsapp_phone || '';
    if (!whatsappPhone) {
      const resumeRow = await db.get<{ text_content: string }>(
        `SELECT text_content FROM resumes WHERE user_id = ? LIMIT 1`,
        [userId]
      );
      if (resumeRow?.text_content) {
        whatsappPhone = extractMobilePhoneFromResume(resumeRow.text_content) || '';
      }
    }

    let parsedLocs: string[] = ['Remote'];
    if (user.preferred_locations) {
      try {
        const arr = typeof user.preferred_locations === 'string'
          ? JSON.parse(user.preferred_locations)
          : user.preferred_locations;
        if (Array.isArray(arr) && arr.length > 0) parsedLocs = arr;
      } catch {
        const split = String(user.preferred_locations).split(',').map((s) => s.trim()).filter(Boolean);
        if (split.length > 0) parsedLocs = split;
      }
    }

    const intervalHours = Math.min(5, Math.max(1, Number(settings?.auto_apply_interval_hours) || 1));
    const lastRunAt = settings?.last_auto_apply_run_at || null;
    const nextRunAt = lastRunAt
      ? new Date(new Date(lastRunAt + (lastRunAt.endsWith('Z') ? '' : 'Z')).getTime() + intervalHours * 3600000).toISOString()
      : null;

    res.json({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      preferredLocations: parsedLocs,
      employmentType: user.employment_type,
      minMatchScore: user.min_match_score || 55,
      isVerified: user.is_verified,
      telegramEnabled: settings?.telegram_enabled === 1,
      telegramChatId: settings?.telegram_chat_id || '',
      emailEnabled: settings ? settings.email_notifications === 1 : true,
      autoApplyEnabled: settings ? settings.auto_apply_enabled !== 0 : true,
      autoApplyIntervalHours: intervalHours,
      lastAutoApplyRunAt: lastRunAt,
      nextAutoApplyRunAt: nextRunAt,
      whatsappEnabled: settings?.whatsapp_enabled === 1,
      whatsappPhone,
      whatsappApiKey: settings?.whatsapp_api_key || '',
      imapEnabled: settings?.imap_enabled === 1,
      imapEmail: settings?.imap_email || user.email,
      imapHost: settings?.imap_host || 'imap.gmail.com',
      imapPasswordConfigured: Boolean(settings?.imap_password),
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

    const {
      preferredLocations,
      employmentType,
      minMatchScore,
      telegramEnabled,
      telegramChatId,
      emailEnabled,
      autoApplyEnabled,
      autoApplyIntervalHours,
      whatsappEnabled,
      whatsappPhone,
      whatsappApiKey,
      imapEnabled,
      imapEmail,
      imapPassword,
      imapHost,
    } = req.body;

    const locsJson = Array.isArray(preferredLocations)
      ? JSON.stringify(preferredLocations)
      : typeof preferredLocations === 'string'
      ? preferredLocations
      : JSON.stringify(['Remote']);

    const user = await userRepository.update(userId, {
      preferred_locations: locsJson,
      employment_type: employmentType,
      min_match_score: minMatchScore,
    } as any);

    const db = await getDatabase();
    const existingSettings = await db.get<{ imap_password: string | null; last_auto_apply_run_at: string | null }>(
      `SELECT imap_password, last_auto_apply_run_at FROM automation_settings WHERE user_id = ?`,
      [userId]
    );

    const tEnabled = telegramEnabled ? 1 : 0;
    const eEnabled = emailEnabled === false ? 0 : 1;
    const aEnabled = autoApplyEnabled === false ? 0 : 1;
    const intervalHours = Math.min(5, Math.max(1, Math.round(Number(autoApplyIntervalHours) || 1)));
    const freqLabel = intervalHours === 1 ? 'hourly' : `every_${intervalHours}h`;
    const wEnabled = whatsappEnabled ? 1 : 0;
    const iEnabled = imapEnabled ? 1 : 0;
    const cleanPhone = normalizePhoneNumber(whatsappPhone || '');
    const finalImapPassword =
      typeof imapPassword === 'string' && imapPassword.trim().length > 0
        ? imapPassword.replace(/\s+/g, '')
        : (existingSettings?.imap_password || '');
    
    await db.run(
      `INSERT INTO automation_settings (
         user_id, telegram_enabled, telegram_chat_id, email_notifications, auto_apply_enabled,
         auto_apply_interval_hours, job_search_frequency,
         whatsapp_enabled, whatsapp_phone, whatsapp_api_key,
         imap_enabled, imap_email, imap_password, imap_host
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET
         telegram_enabled = excluded.telegram_enabled,
         telegram_chat_id = excluded.telegram_chat_id,
         email_notifications = excluded.email_notifications,
         auto_apply_enabled = excluded.auto_apply_enabled,
         auto_apply_interval_hours = excluded.auto_apply_interval_hours,
         job_search_frequency = excluded.job_search_frequency,
         whatsapp_enabled = excluded.whatsapp_enabled,
         whatsapp_phone = excluded.whatsapp_phone,
         whatsapp_api_key = excluded.whatsapp_api_key,
         imap_enabled = excluded.imap_enabled,
         imap_email = excluded.imap_email,
         imap_password = excluded.imap_password,
         imap_host = excluded.imap_host,
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        tEnabled,
        telegramChatId || '',
        eEnabled,
        aEnabled,
        intervalHours,
        freqLabel,
        wEnabled,
        cleanPhone,
        (whatsappApiKey || '').trim(),
        iEnabled,
        (imapEmail || user.email || '').trim(),
        finalImapPassword,
        (imapHost || 'imap.gmail.com').trim(),
      ]
    );

    const lastRunAt = existingSettings?.last_auto_apply_run_at || null;
    const nextRunAt = lastRunAt
      ? new Date(new Date(lastRunAt + (lastRunAt.endsWith('Z') ? '' : 'Z')).getTime() + intervalHours * 3600000).toISOString()
      : null;

    res.json({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      preferredLocations: Array.isArray(preferredLocations) ? preferredLocations : ['Remote'],
      employmentType: user.employment_type,
      minMatchScore: user.min_match_score,
      telegramEnabled: Boolean(tEnabled),
      telegramChatId: telegramChatId || '',
      emailEnabled: Boolean(eEnabled),
      autoApplyEnabled: Boolean(aEnabled),
      autoApplyIntervalHours: intervalHours,
      lastAutoApplyRunAt: lastRunAt,
      nextAutoApplyRunAt: nextRunAt,
      whatsappEnabled: Boolean(wEnabled),
      whatsappPhone: cleanPhone,
      whatsappApiKey: (whatsappApiKey || '').trim(),
      imapEnabled: Boolean(iEnabled),
      imapEmail: (imapEmail || user.email || '').trim(),
      imapHost: (imapHost || 'imap.gmail.com').trim(),
      imapPasswordConfigured: Boolean(finalImapPassword),
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
}
