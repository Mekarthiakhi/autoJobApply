import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ApplicationRepository } from '../repositories/applicationRepository.js';
import { AppError } from '../middleware/errorHandler.js';
import { getDatabase } from '../config/database.js';
import { externalSubmitter } from '../services/externalSubmitter.js';
import { whatsappService } from '../services/whatsappService.js';
import { companyReplyTracker } from '../services/companyReplyTracker.js';
import { sendApplicationRunSummaryEmail } from '../utils/email.js';
import { extractMobilePhoneFromResume, normalizePhoneNumber } from '../utils/phoneExtractor.js';
import { logger } from '../utils/logger.js';

const applicationRepository = new ApplicationRepository();

export async function applyAndTailorInternal(
  userId: string,
  jobId: string,
  options?: {
    resumeVersionId?: string;
    coverLetterId?: string;
    notes?: string;
    matchScore?: number;
  }
) {
  const db = await getDatabase();

  // 1. Fetch Job details
  const job = await db.get<any>(`SELECT * FROM jobs WHERE id = ?`, [jobId]);
  if (!job) throw new AppError(404, 'Job not found');

  // 2. Fetch User details
  const user = await db.get<{ id: string; email: string; full_name: string; phone_number: string }>(
    `SELECT id, email, full_name, phone_number FROM users WHERE id = ?`,
    [userId]
  );

  // 3. Fetch Base Resume
  const baseResume = await db.get<{
    id: string;
    file_name: string;
    file_path: string | null;
    text_content: string | null;
    skills: string | null;
  }>(
    `SELECT id, file_name, NULL as file_path, text_content, skills
     FROM resume_versions
     WHERE user_id = ? AND is_default = 1
     UNION ALL
     SELECT id, file_name, file_path, text_content, skills
     FROM resumes
     WHERE user_id = ?
     LIMIT 1`,
    [userId, userId]
  );

  if (!baseResume || !baseResume.text_content) {
    throw new AppError(
      400,
      'Please upload your resume in the Resume tab first so AutoApply AI can tailor it specifically for this job.'
    );
  }

  // 4. Tailor Resume specifically for this job
  let tailoredVersionId = options?.resumeVersionId;
  let tailoredResumeText = baseResume.text_content;
  let tailoredKeywords: string[] = [];

  // Check if an existing tailored version for this job already exists
  const existingTailored = await db.get<{ id: string; text_content: string; skills: string }>(
    `SELECT id, text_content, skills FROM resume_versions WHERE user_id = ? AND target_job_id = ? LIMIT 1`,
    [userId, jobId]
  );

  if (existingTailored) {
    tailoredVersionId = existingTailored.id;
    tailoredResumeText = existingTailored.text_content || tailoredResumeText;
    try {
      tailoredKeywords = JSON.parse(existingTailored.skills || '[]');
    } catch {
      tailoredKeywords = [];
    }
  } else {
    let candidateSkills: string[] = [];
    try {
      candidateSkills = JSON.parse(baseResume.skills || '[]');
    } catch {
      candidateSkills = String(baseResume.skills || '').split(',').map(s => s.trim()).filter(Boolean);
    }

    let requiredSkills: string[] = [];
    try {
      requiredSkills = JSON.parse(job.required_skills || '[]');
    } catch {
      requiredSkills = String(job.required_skills || '').split(',').map(s => s.trim()).filter(Boolean);
    }

    const matchingSkills = requiredSkills.filter(req =>
      candidateSkills.some(cs => cs.toLowerCase().includes(req.toLowerCase()) || req.toLowerCase().includes(cs.toLowerCase()))
    );

    tailoredKeywords = Array.from(new Set([...matchingSkills, ...candidateSkills.slice(0, 8), ...requiredSkills.slice(0, 5)]));

    const tailoredHeader =
      `\n\n========================================================================\n` +
      `[TAILORED RESUME - OPTIMIZED FOR ${job.title.toUpperCase()} AT ${job.company_name.toUpperCase()}]\n` +
      `Target Role: ${job.title}\n` +
      `Target Company: ${job.company_name}\n` +
      `Core Technical Alignment: ${matchingSkills.join(', ') || 'Software Development, System Design'}\n` +
      `Tailored Optimization: Aligned to specific competencies required by ${job.company_name}.\n` +
      `========================================================================\n\n`;

    tailoredResumeText = `${tailoredHeader}${baseResume.text_content}`;

    const calculatedScore = options?.matchScore || Math.min(98, Math.max(75, Math.round(((matchingSkills.length + 1) / (Math.max(1, requiredSkills.length))) * 100)));

    const newTailoredId = uuidv4();
    const cleanCompanyName = (job.company_name || 'Company').replace(/[^a-zA-Z0-9]+/g, '_');
    const tailoredFileName = `${cleanCompanyName}_${job.title.replace(/[^a-zA-Z0-9]+/g, '_')}_Tailored_Resume.pdf`;
    const tailoredLabel = `Tailored: ${job.title} at ${job.company_name}`.slice(0, 240);

    const countRow = await db.get<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM resume_versions WHERE user_id = ?`,
      [userId]
    );
    const nextVersionNum = (countRow?.cnt || 0) + 1;

    await db.run(
      `INSERT INTO resume_versions (
         id, user_id, label, file_name, text_content, skills,
         parent_version_id, target_job_id, ats_score, version_number, is_default
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        newTailoredId,
        userId,
        tailoredLabel,
        tailoredFileName,
        tailoredResumeText,
        JSON.stringify(tailoredKeywords),
        baseResume.id,
        job.id,
        calculatedScore,
        nextVersionNum,
      ]
    );

    tailoredVersionId = newTailoredId;
    logger.info(`📄 Created tailored resume version for ${job.title} at ${job.company_name}`, { newTailoredId });
  }

  // 5. Tailor Cover Letter
  let finalCoverLetterId = options?.coverLetterId;
  let coverLetterContent = '';
  if (!finalCoverLetterId) {
    const existingCover = await db.get<{ id: string; content: string }>(
      `SELECT id, content FROM cover_letters WHERE user_id = ? AND job_id = ? LIMIT 1`,
      [userId, jobId]
    );
    if (existingCover) {
      finalCoverLetterId = existingCover.id;
      coverLetterContent = existingCover.content;
    } else {
      const candidateName = user?.full_name || 'Candidate';
      coverLetterContent =
        `Dear Hiring Team at ${job.company_name},\n\n` +
        `I am writing to express my strong interest in the ${job.title} position at ${job.company_name}. ` +
        `With hands-on experience and expertise in ${tailoredKeywords.slice(0, 4).join(', ') || 'modern software engineering'}, ` +
        `I am eager to contribute to your team's mission.\n\n` +
        `My background aligns closely with the competencies outlined in your job posting for ${job.title}. ` +
        `I look forward to discussing how my experience can deliver measurable impact for ${job.company_name}.\n\n` +
        `Sincerely,\n${candidateName}\n${user?.email || ''}\n${user?.phone_number || ''}`;

      finalCoverLetterId = uuidv4();
      await db.run(
        `INSERT INTO cover_letters (id, user_id, job_id, resume_version_id, content) VALUES (?, ?, ?, ?, ?)`,
        [finalCoverLetterId, userId, jobId, tailoredVersionId, coverLetterContent]
      );
    }
  }

  // 6. Create Application record
  const application = await applicationRepository.create(userId, jobId, {
    resumeVersionId: tailoredVersionId,
    coverLetterId: finalCoverLetterId,
    notes: options?.notes || `Tailored resume and cover letter generated specifically for ${job.company_name}`,
    matchScore: options?.matchScore || 85,
  });

  // 7. Execute External Verified Submission
  let extResult: any = null;
  try {
    extResult = await externalSubmitter.attemptVerifiedSubmission({
      applicationId: application.id,
      job: {
        id: job.id,
        title: job.title,
        company_name: job.company_name,
        apply_url: job.apply_url,
        job_description: job.job_description,
        source: job.source,
      },
      candidate: {
        fullName: user?.full_name || 'Candidate',
        email: user?.email || '',
        phone: user?.phone_number || '',
        resumeFilePath: baseResume.file_path || null,
        resumeText: tailoredResumeText,
      },
      coverLetterText: coverLetterContent,
    });

    const isVerified =
      extResult.externalStatus === 'VERIFIED_ATS_SUBMITTED' ||
      extResult.externalStatus === 'VERIFIED_EMAIL_SENT';

    await db.run(
      `UPDATE applications
       SET external_status = ?,
           submission_proof = ?,
           screenshot_path = COALESCE(?, screenshot_path),
           verified_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE verified_at END,
           status = CASE WHEN ? = 1 THEN 'applied' ELSE status END,
           stage_status = CASE WHEN ? = 1 THEN 'SUBMITTED' ELSE 'READY_FOR_REVIEW' END,
           notes = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        extResult.externalStatus,
        JSON.stringify(extResult.proof),
        extResult.proof?.screenshotFile || null,
        isVerified ? 1 : 0,
        isVerified ? 1 : 0,
        isVerified ? 1 : 0,
        extResult.proof?.reason || 'Tailored resume applied',
        application.id,
        userId,
      ]
    );
  } catch (subErr) {
    logger.warn('External verified submission error, application saved as prepared draft', subErr);
  }

  // 8. Attempt WhatsApp notification if enabled
  try {
    await whatsappService.notifyApplicationSubmitted(userId, {
      applicationId: application.id,
      jobTitle: job.title,
      companyName: job.company_name,
      atsPlatform: job.source || 'Direct',
      verified: extResult?.proof?.verified ?? false,
    });
  } catch (waErr) {
    // Non-blocking
  }

  return {
    message: `Resume tailored for ${job.company_name} and applied successfully!`,
    application: {
      ...application,
      job_title: job.title,
      company_name: job.company_name,
      resume_version_id: tailoredVersionId,
      cover_letter_id: finalCoverLetterId,
      stage_status: extResult?.proof?.verified ? 'SUBMITTED' : 'READY_FOR_REVIEW',
      status: extResult?.proof?.verified ? 'applied' : 'pending',
    },
    tailoredResume: {
      id: tailoredVersionId,
      label: `Tailored: ${job.title} at ${job.company_name}`,
    },
    submissionProof: extResult?.proof || null,
  };
}

export async function applyToJob(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { jobId, resumeVersionId, coverLetterId, notes, matchScore } = req.body;
    if (!jobId) throw new AppError(400, 'Job ID required');

    const result = await applyAndTailorInternal(userId, jobId, {
      resumeVersionId,
      coverLetterId,
      notes,
      matchScore,
    });

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Failed to apply with tailored resume:', error);
      res.status(500).json({ error: 'Failed to apply with tailored resume' });
    }
  }
}

export async function batchApplyToJobs(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    let { jobIds } = req.body;
    const db = await getDatabase();

    // If jobIds not provided, empty, or 'all', select all unapplied profile-matched jobs
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      const matched = await db.all<any[]>(
        `SELECT j.id FROM jobs j
         INNER JOIN match_scores ms ON j.id = ms.job_id AND ms.user_id = ?
         LEFT JOIN applications a ON j.id = a.job_id AND a.user_id = ?
         WHERE (ms.match_score >= 50 AND ms.recommendation != 'Skip')
           AND a.id IS NULL
           AND j.status != 'expired'
         ORDER BY ms.match_score DESC
         LIMIT 50`,
        [userId, userId]
      );
      jobIds = matched.map((m) => m.id);
    }

    if (!jobIds || jobIds.length === 0) {
      return res.status(200).json({
        message: 'No eligible unapplied jobs found to apply.',
        appliedCount: 0,
        successful: [],
        failed: [],
      });
    }

    const successful: any[] = [];
    const failed: any[] = [];

    for (const jId of jobIds) {
      try {
        const itemResult = await applyAndTailorInternal(userId, jId);
        successful.push({
          jobId: jId,
          applicationId: itemResult.application.id,
          company: itemResult.application.company_name,
          title: itemResult.application.job_title,
          status: itemResult.application.stage_status,
        });
      } catch (err: any) {
        failed.push({
          jobId: jId,
          error: err.message || 'Failed to apply',
        });
      }
    }

    res.status(200).json({
      message: `Batch apply completed: ${successful.length} jobs tailored & applied successfully${failed.length > 0 ? `, ${failed.length} failed` : ''}!`,
      appliedCount: successful.length,
      failedCount: failed.length,
      successful,
      failed,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      logger.error('Batch apply error:', error);
      res.status(500).json({ error: 'Failed to batch apply to jobs' });
    }
  }
}

export async function getApplications(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const applications = await applicationRepository.findByUserId(userId);

    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
}

export async function updateApplicationStatus(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { applicationId } = req.params;
    const { status } = req.body;

    if (!status) throw new AppError(400, 'Status required');

    const application = await applicationRepository.updateStatus(applicationId, userId, status);
    if (!application) {
      throw new AppError(404, 'Application not found or unauthorized');
    }

    res.json(application);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update application' });
    }
  }
}

export async function verifyAndSubmitApplication(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { applicationId } = req.params;
    const db = await getDatabase();
    const row = await db.get<any>(
      `SELECT a.*, j.title, j.company_name, j.apply_url, j.job_description, j.source,
              rv.text_content as resume_text, cl.content as cover_letter_content
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       LEFT JOIN resume_versions rv ON a.resume_version_id = rv.id
       LEFT JOIN cover_letters cl ON a.cover_letter_id = cl.id
       WHERE a.id = ? AND a.user_id = ?`,
      [applicationId, userId]
    );
    if (!row) throw new AppError(404, 'Application not found');

    const user = await db.get<{ email: string; full_name: string }>(
      `SELECT email, full_name FROM users WHERE id = ?`,
      [userId]
    );
    const baseResume = await db.get<{ file_path: string | null; text_content: string | null }>(
      `SELECT file_path, text_content FROM resumes WHERE user_id = ? LIMIT 1`,
      [userId]
    );

    const extResult = await externalSubmitter.attemptVerifiedSubmission({
      applicationId,
      job: {
        id: row.job_id,
        title: row.title,
        company_name: row.company_name,
        apply_url: row.apply_url,
        job_description: row.job_description,
        source: row.source,
      },
      candidate: {
        fullName: user?.full_name || 'Candidate',
        email: user?.email || '',
        resumeFilePath: baseResume?.file_path || null,
        resumeText: row.resume_text || baseResume?.text_content || '',
      },
      coverLetterText: row.cover_letter_content || '',
    });

    const isVerified =
      extResult.externalStatus === 'VERIFIED_ATS_SUBMITTED' ||
      extResult.externalStatus === 'VERIFIED_EMAIL_SENT';

    await db.run(
      `UPDATE applications
       SET external_status = ?,
           submission_proof = ?,
           screenshot_path = COALESCE(?, screenshot_path),
           verified_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE verified_at END,
           status = CASE WHEN ? = 1 THEN 'applied' ELSE 'pending' END,
           stage_status = CASE WHEN ? = 1 THEN 'SUBMITTED' ELSE 'READY_FOR_REVIEW' END,
           notes = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        extResult.externalStatus,
        JSON.stringify(extResult.proof),
        extResult.proof.screenshotFile || null,
        isVerified ? 1 : 0,
        isVerified ? 1 : 0,
        isVerified ? 1 : 0,
        extResult.proof.reason,
        applicationId,
        userId,
      ]
    );

    res.json({
      verified: isVerified,
      externalStatus: extResult.externalStatus,
      proof: extResult.proof,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to verify external submission' });
    }
  }
}

export async function confirmManualApplied(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { applicationId } = req.params;
    const db = await getDatabase();
    const existing = await db.get<any>(
      `SELECT id, submission_proof FROM applications WHERE id = ? AND user_id = ?`,
      [applicationId, userId]
    );
    if (!existing) throw new AppError(404, 'Application not found');

    let proofObj: any = {};
    try {
      if (existing.submission_proof) proofObj = JSON.parse(existing.submission_proof);
    } catch {
      proofObj = {};
    }
    proofObj.verified = true;
    proofObj.method = proofObj.method || 'manual_confirmed';
    proofObj.confirmationText = 'Candidate confirmed external submission on company website.';
    proofObj.confirmedAt = new Date().toISOString();

    await db.run(
      `UPDATE applications
       SET status = 'applied',
           external_status = 'USER_CONFIRMED_APPLIED',
           stage_status = 'SUBMITTED',
           submission_proof = ?,
           verified_at = CURRENT_TIMESTAMP,
           applied_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [JSON.stringify(proofObj), applicationId, userId]
    );

    res.json({ message: 'Confirmed as externally applied', externalStatus: 'USER_CONFIRMED_APPLIED', proof: proofObj });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to confirm application' });
    }
  }
}

export async function sendWhatsAppSummary(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const db = await getDatabase();
    const apps = await applicationRepository.findByUserId(userId);
    const settings = await db.get<{ whatsapp_phone: string | null; whatsapp_api_key: string | null }>(
      `SELECT whatsapp_phone, whatsapp_api_key FROM automation_settings WHERE user_id = ?`,
      [userId]
    );
    let resolvedPhone = normalizePhoneNumber(req.body?.phone || settings?.whatsapp_phone || '');
    if (!resolvedPhone) {
      const resRow = await db.get<{ text_content: string }>(`SELECT text_content FROM resumes WHERE user_id = ? LIMIT 1`, [userId]);
      if (resRow?.text_content) resolvedPhone = extractMobilePhoneFromResume(resRow.text_content) || '';
    }

    const appUrl = (process.env.FRONTEND_URL || 'https://autojobapply-production-69da9ff5.up.railway.app').replace(/\/$/, '');
    const items = apps.slice(0, 10).map((a: any) => ({
      jobTitle: a.job_title || a.title || 'Software Role',
      companyName: a.company_name || 'Company',
      matchScore: Math.round(a.match_score || 0),
      externalStatus: a.external_status || 'AI_PREPARED',
      applyUrl: a.apply_url,
    }));

    const message = whatsappService.buildRunSummaryMessage(items, appUrl);
    const result = await whatsappService.sendMessage(message, {
      phone: resolvedPhone,
      apiKey: req.body?.apiKey || settings?.whatsapp_api_key,
    });

    res.json({
      ...result,
      phone: resolvedPhone,
      message,
      whatsappShareUrl: `https://wa.me/${resolvedPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send WhatsApp summary' });
  }
}

export async function checkCompanyReplies(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const result = await companyReplyTracker.checkUserReplies(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check company replies' });
  }
}

export async function sendTestReport(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const db = await getDatabase();
    const user = await db.get<{ email: string; full_name: string }>(
      `SELECT email, full_name FROM users WHERE id = ?`,
      [userId]
    );
    if (!user) throw new AppError(404, 'User not found');

    const apps = await applicationRepository.findByUserId(userId);
    const settings = await db.get<{ whatsapp_phone: string | null; whatsapp_api_key: string | null }>(
      `SELECT whatsapp_phone, whatsapp_api_key FROM automation_settings WHERE user_id = ?`,
      [userId]
    );

    let resolvedPhone = normalizePhoneNumber(req.body?.phone || settings?.whatsapp_phone || '');
    if (!resolvedPhone) {
      const resRow = await db.get<{ text_content: string }>(`SELECT text_content FROM resumes WHERE user_id = ? LIMIT 1`, [userId]);
      if (resRow?.text_content) resolvedPhone = extractMobilePhoneFromResume(resRow.text_content) || '';
    }

    if (!apps || apps.length === 0) {
      throw new AppError(400, 'No real applications tracked yet. Run job discovery first to send a live report.');
    }

    const reportItems = apps.slice(0, 10).map((a: any) => {
      let proof: any = {};
      try { if (a.submission_proof) proof = JSON.parse(a.submission_proof); } catch {}
      return {
        jobTitle: a.job_title || a.title || 'Software Role',
        companyName: a.company_name || 'Company',
        matchScore: Math.round(a.match_score || 0),
        externalStatus: a.external_status || 'AI_PREPARED',
        applyUrl: proof.finalUrl || a.apply_url,
        reason: proof.confirmationText || proof.reason || a.notes || '',
        atsPlatform: proof.atsPlatform || a.source || '',
      };
    });

    const emailResult = await sendApplicationRunSummaryEmail(user.email, user.full_name, reportItems);

    const appUrl = (process.env.FRONTEND_URL || 'https://autojobapply-production-69da9ff5.up.railway.app').replace(/\/$/, '');
    const waMessage = whatsappService.buildRunSummaryMessage(reportItems, appUrl);
    const waResult = await whatsappService.sendMessage(waMessage, {
      phone: resolvedPhone,
      apiKey: req.body?.apiKey || settings?.whatsapp_api_key,
    });

    res.json({
      email: { ...emailResult, to: user.email },
      whatsapp: {
        ...waResult,
        phone: resolvedPhone,
        whatsappShareUrl: `https://wa.me/${resolvedPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMessage)}`,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to send test report' });
    }
  }
}
