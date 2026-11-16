import { Resend } from 'resend';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class EmailService {
  private resend: Resend | null = null;

  private getClient(): Resend | null {
    if (!this.resend && env.RESEND_API_KEY) {
      this.resend = new Resend(env.RESEND_API_KEY);
    }
    return this.resend;
  }

  async sendEmail(to: string, subject: string, html: string) {
    try {
      const client = this.getClient();
      if (!client) {
        logger.warn('Resend API Key is missing. Skipping email.');
        return;
      }
      const data = await client.emails.send({
        from: 'JobAuto <onboarding@resend.dev>', // Adjust to verified domain in production
        to: [to],
        subject: subject,
        html: html,
      });
      logger.info(`Email sent successfully to ${to}`);
      return data;
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendApplicationConfirmation(to: string, jobTitle: string, company: string) {
    const subject = `Application Confirmed: ${jobTitle} at ${company}`;
    const html = `
      <h2>Great news!</h2>
      <p>Your application for <strong>${jobTitle}</strong> at <strong>${company}</strong> was submitted successfully by your AI Job Automation Platform.</p>
      <p>We will let you know if there are any updates.</p>
    `;
    return this.sendEmail(to, subject, html);
  }
}

export const emailService = new EmailService();
