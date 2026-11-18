import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import axios from 'axios';
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
  provider?: 'brevo' | 'smtp' | 'resend';
  id?: string;
  error?: string;
}

interface MailPayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Universal mail sender supporting multiple providers so emails can be delivered to ANY address:
 * 1. Brevo HTTP API (BREVO_API_KEY) — works over HTTPS 443 on all cloud hosts, no custom domain needed
 * 2. SMTP / Gmail (SMTP_USER + SMTP_PASS) — works with any Gmail App Password or custom SMTP server
 * 3. Resend API (RESEND_API_KEY) — works for any address once a custom domain is verified
 */
async function sendMail({ to, subject, html }: MailPayload): Promise<EmailSendResult> {
  // 1. Brevo HTTP API (HTTPS port 443, sends to any recipient without needing a custom domain)
  const brevoKey = process.env.BREVO_API_KEY || env.BREVO_API_KEY;
  if (brevoKey) {
    try {
      const senderEmail = process.env.EMAIL_FROM || env.EMAIL_FROM || process.env.SMTP_USER || 'akhileshmekarthi74@gmail.com';
      const senderMatch = senderEmail.match(/<(.+)>/);
      const cleanSenderEmail = senderMatch ? senderMatch[1] : senderEmail;
      const response = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: { name: 'AutoApply AI', email: cleanSenderEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        },
        {
          headers: {
            'api-key': brevoKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: 15000,
        }
      );
      const messageId = response.data?.messageId;
      logger.info(`Email sent via Brevo to ${to} (id: ${messageId})`);
      return { sent: true, provider: 'brevo', id: messageId };
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Brevo API error';
      logger.error('Brevo email delivery failed', { to, error: msg });
      return { sent: false, provider: 'brevo', error: msg };
    }
  }

  // 2. SMTP / Gmail via Nodemailer (sends to any recipient email address)
  const smtpUser = process.env.SMTP_USER || env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || env.SMTP_PASS;
  if (smtpUser && smtpPass) {
    try {
      const smtpHost = process.env.SMTP_HOST || env.SMTP_HOST || 'smtp.gmail.com';
      const smtpPort = parseInt(process.env.SMTP_PORT || String(env.SMTP_PORT || 587), 10);
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass.replace(/\s+/g, ''),
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
      });

      const fromAddress = process.env.EMAIL_FROM || env.EMAIL_FROM || `AutoApply AI <${smtpUser}>`;
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
      });

      logger.info(`Email sent via SMTP (${smtpHost}) to ${to} (id: ${info.messageId})`);
      return { sent: true, provider: 'smtp', id: info.messageId };
    } catch (err: any) {
      const msg = err?.message || 'SMTP email delivery failed';
      logger.error('SMTP email delivery failed', { to, error: msg });
      return { sent: false, provider: 'smtp', error: msg };
    }
  }

  // 3. Resend API
  const resendKey = process.env.RESEND_API_KEY || env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const fromAddress = process.env.EMAIL_FROM || env.EMAIL_FROM || 'AutoApply AI <onboarding@resend.dev>';
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to,
        subject,
        html,
      });

      if (error) {
        logger.error('Resend rejected email', { to, error });
        return { sent: false, provider: 'resend', error: error.message || 'Email delivery rejected by Resend' };
      }

      logger.info(`Email sent via Resend to ${to} (id: ${data?.id})`);
      return { sent: true, provider: 'resend', id: data?.id };
    } catch (err: any) {
      logger.error('Resend email delivery failed', err);
      return { sent: false, provider: 'resend', error: err?.message || 'Resend email delivery failed' };
    }
  }

  logger.info(`[MOCK EMAIL] No email provider configured. Intended recipient: ${to}, subject: ${subject}`);
  return { sent: false, error: 'No email provider is configured on the server (set BREVO_API_KEY, SMTP_USER/SMTP_PASS, or RESEND_API_KEY).' };
}

export async function sendVerificationEmail(email: string, fullName: string, token: string): Promise<EmailSendResult> {
  const frontendUrl = getFrontendBaseUrl();
  const verifyLink = `${frontendUrl}/verify-email?token=${token}`;

  return sendMail({
    to: email,
    subject: 'Verify your email for AutoApply AI',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4f46e5;">Welcome to AutoApply AI, ${fullName || 'there'}!</h2>
        <p>You're one step away from automating your job search. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
        </div>
        <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, fullName: string, token: string): Promise<EmailSendResult> {
  const frontendUrl = getFrontendBaseUrl();
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;

  return sendMail({
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
}
