import { Request, Response } from 'express';
import { ApplicationRepository } from '../repositories/applicationRepository.js';
import { AppError } from '../middleware/errorHandler.js';
import { getDatabase } from '../config/database.js';
import { externalSubmitter } from '../services/externalSubmitter.js';
import { whatsappService } from '../services/whatsappService.js';

const applicationRepository = new ApplicationRepository();

export async function applyToJob(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { jobId, resumeVersionId, coverLetterId, notes, matchScore } = req.body;
    if (!jobId) throw new AppError(400, 'Job ID required');

    const application = await applicationRepository.create(userId, jobId, {
      resumeVersionId,
      coverLetterId,
      notes,
      matchScore,
    });

    res.status(201).json({
      message: 'Application submitted',
      application,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to submit application' });
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
      phone: req.body?.phone || settings?.whatsapp_phone,
      apiKey: req.body?.apiKey || settings?.whatsapp_api_key,
    });

    res.json({
      ...result,
      message,
      whatsappShareUrl: `https://wa.me/${(req.body?.phone || settings?.whatsapp_phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send WhatsApp summary' });
  }
}
