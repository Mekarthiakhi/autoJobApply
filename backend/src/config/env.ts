import 'dotenv/config';
import path from 'path';

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000'),
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432'),
  DB_NAME: process.env.DB_NAME || 'job_automation',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
  DB_SSL: process.env.DB_SSL === 'true',
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || '',
  RESUME_MAX_SIZE: 5 * 1024 * 1024, // 5MB

  // New: directories for agent outputs
  SCREENSHOTS_DIR: process.env.SCREENSHOTS_DIR || path.resolve(process.cwd(), 'screenshots'),
  EXPORT_DIR: process.env.EXPORT_DIR || path.resolve(process.cwd(), 'exports'),
};

export function validateEnvironmentSecurity(): { isSecure: boolean; issues: string[] } {
  const issues: string[] = [];
  const isStrict = env.NODE_ENV === 'production' || env.NODE_ENV === 'staging';

  if (isStrict) {
    if (env.JWT_SECRET === 'your-secret-key' || env.JWT_SECRET.length < 32) {
      issues.push(`JWT_SECRET must be at least 32 characters long in ${env.NODE_ENV} and cannot use default fallback`);
    }
    if (!env.CORS_ORIGIN || env.CORS_ORIGIN === '*' || env.CORS_ORIGIN.includes('*')) {
      issues.push(`CORS_ORIGIN cannot be unset, wildcard (*), or contain wildcard in ${env.NODE_ENV}`);
    }
  } else {
    if (env.JWT_SECRET === 'your-secret-key' || env.JWT_SECRET.length < 16) {
      issues.push('JWT_SECRET is using default insecure secret or length < 16 characters');
    }
  }

  return {
    isSecure: issues.length === 0,
    issues,
  };
}
