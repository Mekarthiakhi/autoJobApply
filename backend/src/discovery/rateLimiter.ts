import { logger } from '../utils/logger.js';
import { BotChallengeResult, JobPlatform } from './types.js';

interface PlatformThrottleConfig {
  minIntervalMs: number;
  lastRequestTime: number;
  consecutiveErrors: number;
  circuitBreakerTrippedUntil: number | null;
}

export class PlatformRateLimiter {
  private platforms: Map<JobPlatform, PlatformThrottleConfig> = new Map([
    ['linkedin', { minIntervalMs: 2500, lastRequestTime: 0, consecutiveErrors: 0, circuitBreakerTrippedUntil: null }],
    ['indeed', { minIntervalMs: 2000, lastRequestTime: 0, consecutiveErrors: 0, circuitBreakerTrippedUntil: null }],
    ['naukri', { minIntervalMs: 1500, lastRequestTime: 0, consecutiveErrors: 0, circuitBreakerTrippedUntil: null }],
    ['glassdoor', { minIntervalMs: 2000, lastRequestTime: 0, consecutiveErrors: 0, circuitBreakerTrippedUntil: null }],
    ['career_page', { minIntervalMs: 1000, lastRequestTime: 0, consecutiveErrors: 0, circuitBreakerTrippedUntil: null }],
    ['other', { minIntervalMs: 1000, lastRequestTime: 0, consecutiveErrors: 0, circuitBreakerTrippedUntil: null }],
  ]);

  /**
   * Enforce rate limit delay before initiating a platform request.
   */
  async throttle(platform: JobPlatform): Promise<void> {
    const config = this.platforms.get(platform) || {
      minIntervalMs: 1000,
      lastRequestTime: 0,
      consecutiveErrors: 0,
      circuitBreakerTrippedUntil: null,
    };

    const now = Date.now();

    // Check circuit breaker
    if (config.circuitBreakerTrippedUntil && now < config.circuitBreakerTrippedUntil) {
      const waitRemainingSec = Math.ceil((config.circuitBreakerTrippedUntil - now) / 1000);
      throw new Error(`Circuit breaker active for ${platform}. Cooldown remaining: ${waitRemainingSec}s.`);
    }

    const elapsed = now - config.lastRequestTime;
    if (elapsed < config.minIntervalMs) {
      const waitTime = config.minIntervalMs - elapsed;
      await new Promise(res => setTimeout(res, waitTime));
    }

    config.lastRequestTime = Date.now();
    this.platforms.set(platform, config);
  }

  recordSuccess(platform: JobPlatform): void {
    const config = this.platforms.get(platform);
    if (config) {
      config.consecutiveErrors = 0;
      config.circuitBreakerTrippedUntil = null;
    }
  }

  recordError(platform: JobPlatform): number {
    const config = this.platforms.get(platform);
    if (!config) return 0;

    config.consecutiveErrors += 1;

    // Trip circuit breaker if 5 consecutive errors occur
    if (config.consecutiveErrors >= 5) {
      const cooldownMs = 5 * 60 * 1000; // 5 minute cooldown
      config.circuitBreakerTrippedUntil = Date.now() + cooldownMs;
      logger.warn(`⚠️ Circuit breaker tripped for platform ${platform} after ${config.consecutiveErrors} consecutive errors. Pausing for 5 minutes.`);
    }

    // Return exponential backoff delay with jitter
    const baseBackoff = Math.min(1000 * Math.pow(2, config.consecutiveErrors - 1), 30000);
    const jitter = Math.floor(Math.random() * 500);
    return baseBackoff + jitter;
  }

  /**
   * Scans content or page text for anti-bot / CAPTCHA / OTP signatures.
   * COMPLIANCE RULE: If detected, never attempt to bypass. Safely halt scraping.
   */
  detectBotChallenge(content: string): BotChallengeResult {
    if (!content) return { isChallenged: false };
    const lower = content.toLowerCase();

    // Cloudflare Turnstile / Challenge
    if (
      lower.includes('cf-turnstile') ||
      lower.includes('challenges.cloudflare.com') ||
      lower.includes('just a moment...') ||
      (lower.includes('enable javascript') && lower.includes('cloudflare'))
    ) {
      return {
        isChallenged: true,
        challengeType: 'cloudflare_turnstile',
        details: 'Cloudflare bot verification or Turnstile challenge encountered.',
      };
    }

    // Google reCAPTCHA
    if (lower.includes('g-recaptcha') || lower.includes('recaptcha/api.js') || lower.includes('google.com/recaptcha')) {
      return {
        isChallenged: true,
        challengeType: 'recaptcha',
        details: 'Google reCAPTCHA verification challenge encountered.',
      };
    }

    // hCaptcha
    if (lower.includes('hcaptcha.com') || lower.includes('h-captcha')) {
      return {
        isChallenged: true,
        challengeType: 'hcaptcha',
        details: 'hCaptcha challenge encountered.',
      };
    }

    // LinkedIn Security Verification / Authwall
    if (
      lower.includes('checkpoint/challenge') ||
      lower.includes('security verification') ||
      lower.includes('please solve this challenge to continue') ||
      lower.includes('authwall')
    ) {
      return {
        isChallenged: true,
        challengeType: 'authwall',
        details: 'LinkedIn security verification or authwall encountered.',
      };
    }

    // OTP challenge
    if (lower.includes('enter one time password') || lower.includes('enter the otp sent to')) {
      return {
        isChallenged: true,
        challengeType: 'otp',
        details: 'One-Time-Password (OTP) challenge encountered.',
      };
    }

    return { isChallenged: false };
  }
}

export const platformRateLimiter = new PlatformRateLimiter();

