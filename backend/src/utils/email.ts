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
  replyTo?: string;
}

/**
 * Universal mail sender supporting multiple providers so emails can be delivered to ANY address:
 * 1. Brevo HTTP API (BREVO_API_KEY) — works over HTTPS 443 on all cloud hosts, no custom domain needed
 * 2. SMTP / Gmail (SMTP_USER + SMTP_PASS) — works with any Gmail App Password or custom SMTP server
 * 3. Resend API (RESEND_API_KEY) — works for any address once a custom domain is verified
 */
export async function sendMail({ to, subject, html, replyTo }: MailPayload): Promise<EmailSendResult> {
  // Strictly block synthetic test domains from ever triggering real outbound emails
  const lowerTo = (to || '').trim().toLowerCase();
  if (!lowerTo || lowerTo.endsWith('@example.com') || lowerTo.endsWith('@test.com') || lowerTo.endsWith('.invalid')) {
    return { sent: false, error: 'Refused to send email to non-real test address.' };
  }

  // 1. Brevo HTTP API (HTTPS port 443, sends to any recipient without needing a custom domain)
  const brevoKey = process.env.BREVO_API_KEY || env.BREVO_API_KEY;
  if (brevoKey) {
    try {
      const senderEmail = process.env.EMAIL_FROM || env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@autoapply.local';
      const senderMatch = senderEmail.match(/<(.+)>/);
      const cleanSenderEmail = senderMatch ? senderMatch[1] : senderEmail;
      const body: Record<string, any> = {
        sender: { name: 'AutoApply AI', email: cleanSenderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      };
      if (replyTo) {
        body.replyTo = { email: replyTo };
      }
      const response = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        body,
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

export interface ApplicationReportItem {
  jobTitle: string;
  companyName: string;
  matchScore: number;
  externalStatus: string;
  applyUrl?: string;
  reason?: string;
  atsPlatform?: string;
}

export async function sendApplicationRunSummaryEmail(
  email: string,
  fullName: string,
  items: ApplicationReportItem[]
): Promise<EmailSendResult> {
  if (!email || items.length === 0) {
    return { sent: false, error: 'No items to report' };
  }
  const frontendUrl = getFrontendBaseUrl();
  const verified = items.filter(
    (i) => i.externalStatus === 'VERIFIED_ATS_SUBMITTED' || i.externalStatus === 'VERIFIED_EMAIL_SENT'
  );
  const manual = items.filter(
    (i) => i.externalStatus !== 'VERIFIED_ATS_SUBMITTED' && i.externalStatus !== 'VERIFIED_EMAIL_SENT'
  );

  const renderRows = (list: ApplicationReportItem[], badgeColor: string, badgeLabel: string) =>
    list
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong>${item.jobTitle}</strong><br/>
          <span style="color:#666; font-size:12px;">${item.companyName} · ${item.matchScore}% match${item.atsPlatform ? ` · ${item.atsPlatform}` : ''}</span>
          ${item.reason ? `<div style="color:#64748b; font-size:11px; margin-top:3px;">${item.reason}</div>` : ''}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align:right; white-space:nowrap;">
          <span style="background:${badgeColor}; color:#fff; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:600;">${badgeLabel}</span>
          ${item.applyUrl ? `<br/><a href="${item.applyUrl}" style="font-size:11px; color:#4f46e5; display:inline-block; margin-top:4px;">Open Company Page →</a>` : ''}
        </td>
      </tr>`
      )
      .join('');

  const html = `
    <div style="font-family: sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #4f46e5; margin-top: 0;">AutoApply AI Verification Report</h2>
      <p style="color:#334155;">Hi ${fullName || 'there'}, here is the verified status of your latest autonomous job run:</p>
      <div style="display:flex; gap:12px; margin: 16px 0;">
        <div style="flex:1; background:#ecfdf5; border:1px solid #a7f3d0; padding:12px; border-radius:8px; text-align:center;">
          <div style="font-size:22px; font-weight:700; color:#059669;">${verified.length}</div>
          <div style="font-size:12px; color:#065f46;">Verified Externally Submitted</div>
        </div>
        <div style="flex:1; background:#fffbeb; border:1px solid #fde68a; padding:12px; border-radius:8px; text-align:center;">
          <div style="font-size:22px; font-weight:700; color:#d97706;">${manual.length}</div>
          <div style="font-size:12px; color:#92400e;">AI Prepared (1-Click Apply)</div>
        </div>
      </div>
      ${
        verified.length > 0
          ? `<h3 style="color:#059669; margin-bottom:8px;">✅ Verified Externally Submitted</h3>
             <table style="width:100%; border-collapse:collapse; margin-bottom:18px;">${renderRows(verified, '#059669', 'Verified Applied')}</table>`
          : ''
      }
      ${
        manual.length > 0
          ? `<h3 style="color:#d97706; margin-bottom:8px;">⚡ AI Prepared — Ready for 1-Click Apply</h3>
             <p style="font-size:12px; color:#64748b; margin-top:0;">Tailored resumes and Gemini cover letters are ready. These portals required login, CAPTCHA, or custom questions.</p>
             <table style="width:100%; border-collapse:collapse; margin-bottom:18px;">${renderRows(manual, '#d97706', '1-Click Apply')}</table>`
          : ''
      }
      <div style="text-align: center; margin-top: 24px;">
        <a href="${frontendUrl}/applications" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Live Screenshots & Proof</a>
      </div>
    </div>
  `;

  return sendMail({
    to: email,
    subject: `AutoApply Report: ${verified.length} Verified Applied · ${manual.length} Ready for 1-Click Apply`,
    html,
  });
}
