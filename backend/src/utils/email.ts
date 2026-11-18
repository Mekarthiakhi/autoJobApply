import { Resend } from 'resend';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const resend = new Resend(env.RESEND_API_KEY || 're_mock_key');

function getFrontendBaseUrl(): string {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL.replace(/\/$/, '');
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return 'http://localhost:3000';
}

export interface EmailSendResult {
  sent: boolean;
  id?: string;
  error?: string;
}

const DEFAULT_FROM = process.env.EMAIL_FROM || 'AutoApply AI <onboarding@resend.dev>';

export async function sendVerificationEmail(email: string, fullName: string, token: string): Promise<EmailSendResult> {
  try {
    const frontendUrl = getFrontendBaseUrl();
    const verifyLink = `${frontendUrl}/verify-email?token=${token}`;

    if (!env.RESEND_API_KEY) {
      logger.info(`[MOCK EMAIL] Verification email to ${email}. Link: ${verifyLink}`);
      return { sent: false, error: 'Email service (RESEND_API_KEY) is not configured on the server.' };
    }

    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: email,
      subject: 'Verify your email for AutoApply AI',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #4f46e5;">Welcome to AutoApply AI, ${fullName}!</h2>
          <p>You're one step away from automating your job search. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
          </div>
          <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      logger.error('Resend rejected verification email', error);
      return { sent: false, error: error.message || 'Email delivery rejected by Resend' };
    }

    logger.info(`Verification email sent to ${email} (id: ${data?.id})`);
    return { sent: true, id: data?.id };
  } catch (error: any) {
    logger.error('Failed to send verification email', error);
    return { sent: false, error: error?.message || 'Failed to send verification email' };
  }
}

export async function sendPasswordResetEmail(email: string, fullName: string, token: string): Promise<EmailSendResult> {
  try {
    const frontendUrl = getFrontendBaseUrl();
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    if (!env.RESEND_API_KEY) {
      logger.info(`[MOCK EMAIL] Password reset email to ${email}. Link: ${resetLink}`);
      return { sent: false, error: 'Email service (RESEND_API_KEY) is not configured on the server.' };
    }

    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: email,
      subject: 'Reset your password for AutoApply AI',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #4f46e5;">Hello, ${fullName || 'there'}</h2>
          <p>We received a request to reset your password. Click the button below to choose a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. This link will expire in 1 hour.</p>
        </div>
      `,
    });

    if (error) {
      logger.error('Resend rejected password reset email', error);
      return { sent: false, error: error.message || 'Email delivery rejected by Resend' };
    }

    logger.info(`Password reset email sent to ${email} (id: ${data?.id})`);
    return { sent: true, id: data?.id };
  } catch (error: any) {
    logger.error('Failed to send password reset email', error);
    return { sent: false, error: error?.message || 'Failed to send password reset email' };
  }
}
