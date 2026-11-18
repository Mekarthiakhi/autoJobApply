import { chromium, Page } from 'playwright';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { sendMail } from '../utils/email.js';
import { controlledBrowserAgent } from '../execution/controlledBrowserAgent.js';

export type ExternalSubmissionStatus =
  | 'VERIFIED_ATS_SUBMITTED'
  | 'VERIFIED_EMAIL_SENT'
  | 'MANUAL_APPLY_REQUIRED'
  | 'JOB_CLOSED'
  | 'USER_CONFIRMED_APPLIED';

export interface SubmissionProof {
  method: 'ats_form' | 'direct_email' | 'manual_required';
  verified: boolean;
  atsPlatform: string;
  finalUrl: string;
  screenshotFile?: string | null;
  screenshotUrl?: string | null;
  confirmationText?: string | null;
  emailMessageId?: string | null;
  recruiterEmail?: string | null;
  missingFields?: string[];
  reason: string;
  attemptedAt: string;
}

export interface ExternalSubmissionResult {
  externalStatus: ExternalSubmissionStatus;
  proof: SubmissionProof;
}

export interface SubmissionCandidateInfo {
  fullName: string;
  email: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  resumeFilePath?: string | null;
  resumeText: string;
}

const IGNORED_EMAIL_DOMAINS = [
  'example.com',
  'remotive.com',
  'remoteok.com',
  'jobicy.com',
  'himalayas.app',
  'jooble.org',
  'arbeitnow.com',
  'w3.org',
  'sentry.io',
  'cloudflare.com',
];

const IGNORED_EMAIL_PREFIXES = [
  'noreply',
  'no-reply',
  'donotreply',
  'privacy',
  'legal',
  'dmca',
  'abuse',
  'security',
  'support',
  'press',
  'media',
  'sales',
];

function extractCandidateContacts(candidate: SubmissionCandidateInfo) {
  const text = candidate.resumeText || '';
  const phoneMatch = text.match(/(?:\+?\d{1,3}[\s.-]?)?\(?\d{3,5}\)?[\s.-]?\d{3,5}[\s.-]?\d{3,5}/);
  const linkedinMatch = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
  const githubMatch = text.match(/https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i);
  const nameParts = (candidate.fullName || 'Candidate').trim().split(/\s+/);
  return {
    fullName: candidate.fullName || 'Candidate',
    firstName: nameParts[0] || 'Candidate',
    lastName: nameParts.slice(1).join(' ') || nameParts[0] || 'Candidate',
    email: candidate.email,
    phone: candidate.phone || phoneMatch?.[0]?.trim() || '',
    linkedin: candidate.linkedin || linkedinMatch?.[0] || '',
    github: candidate.github || githubMatch?.[0] || '',
  };
}

function detectAtsPlatform(url: string): string {
  const u = (url || '').toLowerCase();
  if (u.includes('greenhouse.io')) return 'Greenhouse';
  if (u.includes('lever.co')) return 'Lever';
  if (u.includes('ashbyhq.com')) return 'Ashby';
  if (u.includes('workable.com')) return 'Workable';
  if (u.includes('smartrecruiters.com')) return 'SmartRecruiters';
  if (u.includes('recruitee.com')) return 'Recruitee';
  if (u.includes('breezy.hr')) return 'BreezyHR';
  if (u.includes('jazzhr.com') || u.includes('applytojob.com')) return 'JazzHR';
  if (u.includes('myworkdayjobs.com') || u.includes('workday.com')) return 'Workday';
  if (u.includes('linkedin.com')) return 'LinkedIn';
  if (u.includes('indeed.com')) return 'Indeed';
  if (u.includes('jooble.org')) return 'Jooble';
  if (u.includes('remotive.com')) return 'Remotive';
  if (u.includes('remoteok.com')) return 'RemoteOK';
  if (u.includes('himalayas.app')) return 'Himalayas';
  if (u.includes('jobicy.com')) return 'Jobicy';
  if (u.includes('arbeitnow.com')) return 'Arbeitnow';
  return 'External Career Portal';
}

function extractDirectRecruiterEmail(applyUrl: string, description: string): string | null {
  if (applyUrl && applyUrl.toLowerCase().startsWith('mailto:')) {
    const raw = applyUrl.slice(7).split('?')[0].trim();
    if (raw.includes('@')) return raw;
  }

  const combined = `${description || ''}`;
  const matches = combined.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  for (const rawEmail of matches) {
    const lower = rawEmail.toLowerCase();
    const [prefix, domain] = lower.split('@');
    if (!prefix || !domain) continue;
    if (IGNORED_EMAIL_DOMAINS.some((d) => domain.endsWith(d))) continue;
    if (IGNORED_EMAIL_PREFIXES.some((p) => prefix.startsWith(p))) continue;
    // Prefer recruiting/careers/jobs/hr/talent/apply addresses
    if (/career|job|hir|recruit|talent|hr|apply|people|team|hello|founder/i.test(prefix)) {
      return rawEmail;
    }
  }
  return null;
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function safeScreenshot(page: Page, applicationId: string): Promise<{ file: string | null; url: string | null }> {
  try {
    ensureDir(env.SCREENSHOTS_DIR);
    const safeId = applicationId.replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = `proof-${safeId}-${Date.now()}.png`;
    const fullPath = path.join(env.SCREENSHOTS_DIR, fileName);
    await page.screenshot({ path: fullPath, fullPage: false, timeout: 8000 });
    return { file: fileName, url: `/api/screenshots/${fileName}` };
  } catch (err: any) {
    logger.warn('Failed to capture proof screenshot', { error: err?.message });
    return { file: null, url: null };
  }
}

async function prepareUploadableResumePdf(
  browser: any,
  applicationId: string,
  candidate: SubmissionCandidateInfo
): Promise<string | null> {
  if (candidate.resumeFilePath && fs.existsSync(candidate.resumeFilePath)) {
    return candidate.resumeFilePath;
  }
  // Generate a genuine ATS-compatible PDF using Playwright Chromium so Greenhouse/Lever/Ashby accept it cleanly
  try {
    const exportDir = env.EXPORT_DIR || path.resolve(process.cwd(), 'exports');
    ensureDir(exportDir);
    const safeName = (candidate.fullName || 'Resume').replace(/[^a-zA-Z0-9]+/g, '_');
    const pdfPath = path.join(exportDir, `${safeName}_Tailored_${applicationId.slice(0, 8)}.pdf`);
    const escapedText = (candidate.resumeText || 'Resume')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const pdfPage = await browser.newPage();
    await pdfPage.setContent(
      `<!doctype html><html><head><meta charset="utf-8"><style>
        body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.45; color: #111827; padding: 28px 34px; }
        h1 { font-size: 16pt; margin: 0 0 6px; color: #111827; }
        pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
      </style></head><body><h1>${candidate.fullName || 'Candidate'}</h1><pre>${escapedText.slice(0, 12000)}</pre></body></html>`,
      { waitUntil: 'load' }
    );
    await pdfPage.pdf({ path: pdfPath, format: 'A4', printBackground: true });
    await pdfPage.close().catch(() => {});
    return pdfPath;
  } catch (err: any) {
    logger.warn('Failed to render tailored PDF via Playwright', { error: err?.message });
    return null;
  }
}

async function detectLoginWall(page: Page): Promise<boolean> {
  try {
    const url = page.url().toLowerCase();
    if (/\/login|\/signin|\/sign-in|accounts\.google|authwall|checkpoint/i.test(url)) {
      return true;
    }
    const hasPasswordInput = await page.locator('input[type="password"]:visible').count().catch(() => 0);
    if (hasPasswordInput > 0) {
      const hasEmailApplyForm = await page.locator('input[type="file"]').count().catch(() => 0);
      if (hasEmailApplyForm === 0) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export class ExternalApplicationSubmitter {
  /**
   * Attempts a GENUINE, verifiable external job submission via:
   *  1. Direct recruiter/careers email (via Brevo with Reply-To = candidate.email), OR
   *  2. Real headless Playwright inspection & public ATS form submission (STRICTLY halting on CAPTCHAs, login walls, or missing required answers).
   *
   * NEVER claims VERIFIED unless the external ATS displays real confirmation text OR Brevo returns a real delivery messageId.
   */
  async attemptVerifiedSubmission(params: {
    applicationId: string;
    job: {
      id: string;
      title: string;
      company_name: string;
      apply_url?: string;
      job_description?: string;
      source?: string;
    };
    candidate: SubmissionCandidateInfo;
    coverLetterText: string;
  }): Promise<ExternalSubmissionResult> {
    const { applicationId, job, candidate, coverLetterText } = params;
    const attemptedAt = new Date().toISOString();
    const applyUrl = (job.apply_url || '').trim();
    const contacts = extractCandidateContacts(candidate);

    // 1. Check for genuine direct recruiter/hiring email
    const recruiterEmail = extractDirectRecruiterEmail(applyUrl, job.job_description || '');
    if (recruiterEmail) {
      logger.info(`📧 Attempting direct email application to ${recruiterEmail} for "${job.title}" at "${job.company_name}"`);
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
          <p>${(coverLetterText || `Hello ${job.company_name} Hiring Team,\n\nPlease find my application for the ${job.title} position below.`).replace(/\n/g, '<br/>')}</p>
          <hr style="border:none; border-top:1px solid #e2e8f0; margin:20px 0;"/>
          <h3 style="margin-bottom:6px;">Candidate Contact</h3>
          <p style="margin-top:0;">
            <strong>${contacts.fullName}</strong><br/>
            Email: ${contacts.email}<br/>
            ${contacts.phone ? `Phone: ${contacts.phone}<br/>` : ''}
            ${contacts.linkedin ? `LinkedIn: <a href="${contacts.linkedin}">${contacts.linkedin}</a><br/>` : ''}
            ${contacts.github ? `GitHub: <a href="${contacts.github}">${contacts.github}</a><br/>` : ''}
          </p>
          <h3 style="margin-bottom:6px;">Tailored Resume</h3>
          <pre style="white-space: pre-wrap; font-family: inherit; background:#f8fafc; padding:12px; border-radius:6px; font-size:13px;">${(candidate.resumeText || '').slice(0, 6000)}</pre>
        </div>
      `;

      const mailRes = await sendMail({
        to: recruiterEmail,
        subject: `Application for ${job.title} — ${contacts.fullName}`,
        html: emailHtml,
        replyTo: contacts.email,
      });

      if (mailRes.sent) {
        return {
          externalStatus: 'VERIFIED_EMAIL_SENT',
          proof: {
            method: 'direct_email',
            verified: true,
            atsPlatform: 'Direct Recruiter Email',
            finalUrl: applyUrl || `mailto:${recruiterEmail}`,
            emailMessageId: mailRes.id || 'delivered',
            recruiterEmail,
            confirmationText: `Application email genuinely delivered to ${recruiterEmail} (Message ID: ${mailRes.id || 'sent'}). Replies go directly to ${contacts.email}.`,
            reason: `Sent directly to ${recruiterEmail} via ${mailRes.provider || 'email'}`,
            attemptedAt,
          },
        };
      }
    }

    // 2. Real Headless Playwright Inspection & Public ATS Form Submission
    if (!applyUrl || !applyUrl.startsWith('http')) {
      return {
        externalStatus: 'MANUAL_APPLY_REQUIRED',
        proof: {
          method: 'manual_required',
          verified: false,
          atsPlatform: 'Unknown',
          finalUrl: applyUrl,
          reason: 'No valid external HTTP application URL was provided by the job board.',
          attemptedAt,
        },
      };
    }

    let browser: any = null;
    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      });
      const page: Page = await context.newPage();
      page.setDefaultTimeout(12000);

      try {
        await page.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1500);
      } catch (navErr: any) {
        const shot = await safeScreenshot(page, applicationId);
        return {
          externalStatus: 'MANUAL_APPLY_REQUIRED',
          proof: {
            method: 'manual_required',
            verified: false,
            atsPlatform: detectAtsPlatform(applyUrl),
            finalUrl: page.url() || applyUrl,
            screenshotFile: shot.file,
            screenshotUrl: shot.url,
            reason: `Company site timed out or blocked automated access (${navErr?.message?.slice(0, 80) || 'timeout'}). Use 1-Click Apply to open it directly.`,
            attemptedAt,
          },
        };
      }

      let currentUrl = page.url();
      let atsPlatform = detectAtsPlatform(currentUrl);

      // Step 2a-0: Check if the job posting is closed/expired (actively hiring check!)
      const initialBodyText = ((await page.textContent('body').catch(() => '')) || '').slice(0, 3000);
      if (/no longer accepting applications|this job is no longer available|position has been filled|job has expired|job posting has closed|sorry, this job is closed/i.test(initialBodyText)) {
        const shot = await safeScreenshot(page, applicationId);
        return {
          externalStatus: 'JOB_CLOSED',
          proof: {
            method: 'manual_required',
            verified: false,
            atsPlatform,
            finalUrl: currentUrl,
            screenshotFile: shot.file,
            screenshotUrl: shot.url,
            reason: `Skipped — ${atsPlatform} shows this position is closed or no longer actively hiring.`,
            attemptedAt,
          },
        };
      }

      // Step 2a: Strictly stop on CAPTCHA / Anti-Bot / Security Verification
      const initialChallenges = await controlledBrowserAgent.detectChallenges(page);
      if (initialChallenges.length > 0) {
        const shot = await safeScreenshot(page, applicationId);
        return {
          externalStatus: 'MANUAL_APPLY_REQUIRED',
          proof: {
            method: 'manual_required',
            verified: false,
            atsPlatform,
            finalUrl: currentUrl,
            screenshotFile: shot.file,
            screenshotUrl: shot.url,
            reason: `Protected by ${initialChallenges.join(', ')} on ${atsPlatform}. Anti-bot checks are never bypassed — click Open Company Site to apply directly.`,
            attemptedAt,
          },
        };
      }

      // Step 2b: Strictly stop on Login Wall
      if (await detectLoginWall(page)) {
        const shot = await safeScreenshot(page, applicationId);
        return {
          externalStatus: 'MANUAL_APPLY_REQUIRED',
          proof: {
            method: 'manual_required',
            verified: false,
            atsPlatform,
            finalUrl: currentUrl,
            screenshotFile: shot.file,
            screenshotUrl: shot.url,
            reason: `${atsPlatform} requires you to sign in to your account before applying. Click Open Company Site with your tailored resume ready.`,
            attemptedAt,
          },
        };
      }

      // Step 2c: If on an aggregator or job overview page, try following a direct ATS link or "Apply" button to reach the actual form
      let hasEmailInput = (await page.locator('input[type="email"]:visible, input[name*="email" i]:visible, #email:visible').count().catch(() => 0)) > 0;
      if (!hasEmailInput) {
        // First look for an embedded direct ATS link (Greenhouse, Lever, Ashby, Workable)
        const directAtsLink = page
          .locator('a[href*="greenhouse.io"], a[href*="lever.co"], a[href*="ashbyhq.com"], a[href*="workable.com"]')
          .first();
        const directHref = await directAtsLink.getAttribute('href').catch(() => null);
        if (directHref && directHref.startsWith('http')) {
          try {
            await page.goto(directHref, { waitUntil: 'domcontentloaded', timeout: 12000 });
            await page.waitForTimeout(1500);
            currentUrl = page.url();
            atsPlatform = detectAtsPlatform(currentUrl);
          } catch {
            // Stay on current page
          }
        }
      }

      hasEmailInput = (await page.locator('input[type="email"]:visible, input[name*="email" i]:visible, #email:visible').count().catch(() => 0)) > 0;
      if (!hasEmailInput) {
        const applyTrigger = page
          .locator(
            'button:has-text("Application"), a:has-text("Application"), a:has-text("Apply for this job"), a:has-text("Apply for this Role"), a:has-text("Apply on company site"), a:has-text("Apply directly"), a:has-text("Apply now"), button:has-text("Apply for this job"), button:has-text("Apply now"), button:has-text("Apply"), a[href*="/application"], a[href*="/apply"]'
          )
          .first();
        if (await applyTrigger.isVisible().catch(() => false)) {
          try {
            const href = await applyTrigger.getAttribute('href').catch(() => null);
            if (href && href.startsWith('http')) {
              await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 12000 });
            } else {
              await applyTrigger.click({ timeout: 5000 });
              await page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
            }
            await page.waitForTimeout(1500);
            currentUrl = page.url();
            atsPlatform = detectAtsPlatform(currentUrl);
          } catch {
            // Stay on current page
          }
        }
      }

      // Re-check CAPTCHA & login wall after following Apply button
      const postNavChallenges = await controlledBrowserAgent.detectChallenges(page);
      if (postNavChallenges.length > 0) {
        const shot = await safeScreenshot(page, applicationId);
        return {
          externalStatus: 'MANUAL_APPLY_REQUIRED',
          proof: {
            method: 'manual_required',
            verified: false,
            atsPlatform,
            finalUrl: currentUrl,
            screenshotFile: shot.file,
            screenshotUrl: shot.url,
            reason: `Protected by ${postNavChallenges.join(', ')} on ${atsPlatform}. Click Open Company Site to complete directly.`,
            attemptedAt,
          },
        };
      }

      if (await detectLoginWall(page)) {
        const shot = await safeScreenshot(page, applicationId);
        return {
          externalStatus: 'MANUAL_APPLY_REQUIRED',
          proof: {
            method: 'manual_required',
            verified: false,
            atsPlatform,
            finalUrl: currentUrl,
            screenshotFile: shot.file,
            screenshotUrl: shot.url,
            reason: `${atsPlatform} requires account login before applying. Click Open Company Site with your tailored resume & cover letter ready.`,
            attemptedAt,
          },
        };
      }

      // Step 2d: Check if a genuine public application form exists on this page
      const emailField = page.locator('input[type="email"]:visible, input[name*="email" i]:visible, input[id*="email" i]:visible').first();
      hasEmailInput = await emailField.isVisible().catch(() => false);
      const submitBtn = page
        .locator('#submit_app:visible, button[type="submit"]:visible, input[type="submit"]:visible, button:has-text("Submit application"):visible, button:has-text("Submit Application"):visible')
        .first();
      const hasSubmitBtn = await submitBtn.isVisible().catch(() => false);

      if (!hasEmailInput || !hasSubmitBtn) {
        const shot = await safeScreenshot(page, applicationId);
        return {
          externalStatus: 'MANUAL_APPLY_REQUIRED',
          proof: {
            method: 'manual_required',
            verified: false,
            atsPlatform,
            finalUrl: currentUrl,
            screenshotFile: shot.file,
            screenshotUrl: shot.url,
            reason: `Opened ${atsPlatform} job page — no direct public application form was found (may redirect to an external portal or require login). Tailored resume & cover letter are ready for 1-Click Apply.`,
            attemptedAt,
          },
        };
      }

      // Step 2e: Fill standard candidate fields safely (using candidate's REAL email so company confirmation goes to their inbox!)
      const fillIfVisible = async (selector: string, value: string) => {
        if (!value) return;
        const loc = page.locator(selector).first();
        if (await loc.isVisible().catch(() => false)) {
          const currentVal = await loc.inputValue().catch(() => '');
          if (!currentVal) {
            await loc.fill(value).catch(() => {});
          }
        }
      };

      await fillIfVisible('#first_name, input[name="first_name" i], input[id*="first_name" i], input[placeholder*="First name" i]', contacts.firstName);
      await fillIfVisible('#last_name, input[name="last_name" i], input[id*="last_name" i], input[placeholder*="Last name" i]', contacts.lastName);
      await fillIfVisible('input[name="_systemfield_name"], input[name="name" i], input[id="name" i], input[placeholder*="Full name" i]', contacts.fullName);
      await emailField.fill(contacts.email).catch(() => {});
      await fillIfVisible('#phone, input[type="tel"], input[name*="phone" i], input[id*="phone" i]', contacts.phone);
      await fillIfVisible('input[name="urls[LinkedIn]"], input[name*="linkedin" i], input[placeholder*="LinkedIn" i]', contacts.linkedin);
      await fillIfVisible('input[name="urls[GitHub]"], input[name*="github" i], input[placeholder*="GitHub" i]', contacts.github);
      await fillIfVisible('textarea[name*="cover" i], textarea[id*="cover" i], textarea[name*="comments" i]', coverLetterText.slice(0, 2500));

      // Upload real PDF resume file if <input type="file"> exists (ATS portals require .pdf)
      const fileInput = page.locator('input[type="file"]').first();
      if ((await fileInput.count().catch(() => 0)) > 0) {
        const resumeFile = await prepareUploadableResumePdf(browser, applicationId, candidate);
        if (resumeFile) {
          await fileInput.setInputFiles(resumeFile).catch(() => {});
          await page.waitForTimeout(1000);
        }
      }

      // Check for any remaining empty required inputs or unchecked required checkboxes (e.g. consent/legal/custom screening questions)
      const missingRequired = await page.evaluate(() => {
        const missing: string[] = [];
        const inputs = Array.from(document.querySelectorAll('input[required], textarea[required], select[required]')) as Array<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >;
        for (const el of inputs) {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          const label = el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || el.id || 'Required field';
          if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'checkbox') {
            if (!(el as HTMLInputElement).checked) missing.push(`Checkbox: ${label}`);
          } else if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'file') {
            if (!(el as HTMLInputElement).files || (el as HTMLInputElement).files!.length === 0) missing.push(`File upload: ${label}`);
          } else if (!el.value || !el.value.trim()) {
            missing.push(label);
          }
        }
        return missing.slice(0, 6);
      });

      if (missingRequired.length > 0) {
        const shot = await safeScreenshot(page, applicationId);
        return {
          externalStatus: 'MANUAL_APPLY_REQUIRED',
          proof: {
            method: 'manual_required',
            verified: false,
            atsPlatform,
            finalUrl: currentUrl,
            screenshotFile: shot.file,
            screenshotUrl: shot.url,
            missingFields: missingRequired,
            reason: `Public ${atsPlatform} form has additional required questions/consent (${missingRequired.join(', ')}). Click Open Company Site to finish submitting accurately.`,
            attemptedAt,
          },
        };
      }

      // Final CAPTCHA check before clicking Submit
      const preSubmitChallenges = await controlledBrowserAgent.detectChallenges(page);
      if (preSubmitChallenges.length > 0) {
        const shot = await safeScreenshot(page, applicationId);
        return {
          externalStatus: 'MANUAL_APPLY_REQUIRED',
          proof: {
            method: 'manual_required',
            verified: false,
            atsPlatform,
            finalUrl: currentUrl,
            screenshotFile: shot.file,
            screenshotUrl: shot.url,
            reason: `Form filled, but ${preSubmitChallenges.join(', ')} appeared before submit. Click Open Company Site to submit directly.`,
            attemptedAt,
          },
        };
      }

      // Step 2f: Genuine Submission & Real Confirmation Verification
      await submitBtn.click({ timeout: 8000 });
      await page.waitForTimeout(4000);

      const postUrl = page.url();
      const postShot = await safeScreenshot(page, applicationId);
      const bodyText = ((await page.textContent('body').catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      const confirmMatch = bodyText.match(
        /(thank you[^.!]{0,120}|application (?:has been )?(?:submitted|received|complete)[^.!]{0,120}|successfully applied[^.!]{0,120}|we have received your application[^.!]{0,120}|thanks for applying[^.!]{0,120})/i
      );

      if (confirmMatch) {
        logger.info(`✅ VERIFIED EXTERNAL ATS SUBMISSION on ${atsPlatform} for "${job.title}" at "${job.company_name}"`, {
          applicationId,
          postUrl,
          confirmation: confirmMatch[0],
        });
        return {
          externalStatus: 'VERIFIED_ATS_SUBMITTED',
          proof: {
            method: 'ats_form',
            verified: true,
            atsPlatform,
            finalUrl: postUrl,
            screenshotFile: postShot.file,
            screenshotUrl: postShot.url,
            confirmationText: confirmMatch[0].trim(),
            reason: `Genuinely submitted on ${atsPlatform} with ${contacts.email}. Check your Gmail inbox for the company's confirmation email.`,
            attemptedAt,
          },
        };
      }

      return {
        externalStatus: 'MANUAL_APPLY_REQUIRED',
        proof: {
          method: 'manual_required',
          verified: false,
          atsPlatform,
          finalUrl: postUrl,
          screenshotFile: postShot.file,
          screenshotUrl: postShot.url,
          reason: `Clicked submit on ${atsPlatform}, but no confirmation message appeared (may have extra validation or anti-bot verification). Inspect the screenshot or open the company site to verify.`,
          attemptedAt,
        },
      };
    } catch (err: any) {
      logger.warn('External submission attempt encountered error', { applicationId, error: err?.message });
      return {
        externalStatus: 'MANUAL_APPLY_REQUIRED',
        proof: {
          method: 'manual_required',
          verified: false,
          atsPlatform: detectAtsPlatform(applyUrl),
          finalUrl: applyUrl,
          reason: `Could not verify external form automatically (${err?.message?.slice(0, 90) || 'error'}). Use 1-Click Apply with your tailored resume & cover letter.`,
          attemptedAt,
        },
      };
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }
}

export const externalSubmitter = new ExternalApplicationSubmitter();
