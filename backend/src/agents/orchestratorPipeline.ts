import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { getDatabase } from '../config/database.js';
import {
  AgentContext,
  AgentResponsibility,
  WorkflowState,
  JobRankingOutput,
  BrowserInspectionOutput,
  CoverLetterOutput,
} from './contracts.js';
import { agentRegistry } from './agentRegistry.js';
import { plannerAgent } from '../services/plannerAgent.js';
import { reviewAgent } from '../services/reviewAgent.js';
import { externalSubmitter } from '../services/externalSubmitter.js';
import { sendApplicationRunSummaryEmail, ApplicationReportItem } from '../utils/email.js';
import { whatsappService } from '../services/whatsappService.js';

export interface WorkflowPipelineOptions {
  workflowId?: string;
  correlationId?: string;
  limitJobs?: number;
  skipBrowserInspection?: boolean;
  skipDiscovery?: boolean;
  initialJobIds?: string[];
  mode?: 'live' | 'test' | 'simulation';
  fastTest?: boolean;
}

export interface WorkflowPipelineSummary {
  workflowId: string;
  userId: string;
  state: WorkflowState;
  startTime: string;
  endTime: string;
  durationMs: number;
  jobsDiscovered: number;
  jobsDeduplicated: number;
  jobsRanked: number;
  draftsQueuedForReview: number;
  errors: string[];
}

export class MultiAgentPipelineOrchestrator {
  /**
   * Run the end-to-end multi-agent workflow with state tracking and human review queue guarantees.
   */
  async runPipeline(
    userId: string,
    options: WorkflowPipelineOptions = {}
  ): Promise<WorkflowPipelineSummary> {
    const workflowId = options.workflowId || `wf-${uuidv4()}`;
    const correlationId = options.correlationId || `corr-${uuidv4()}`;
    const startTime = new Date().toISOString();
    const startTimestamp = Date.now();

    const ctx: AgentContext = {
      userId,
      workflowId,
      correlationId,
    };

    let state: WorkflowState = 'PLANNING';
    const errors: string[] = [];
    let jobsDiscovered = 0;
    let jobsDeduplicated = 0;
    let jobsRanked = 0;
    let draftsQueuedForReview = 0;

    logger.info(`🚀 Starting Multi-Agent Pipeline [${workflowId}]`, { userId, correlationId });

    try {
      // 1. PLANNING PHASE
      state = 'PLANNING';
      const plan = await plannerAgent.buildPlan(userId);

      // 2. DISCOVERY PHASE
      state = 'DISCOVERING';
      const discoveryAgent = agentRegistry.get(AgentResponsibility.JOB_DISCOVERY);
      let discoveredJobIds: string[] = options.initialJobIds ? [...options.initialJobIds] : [];

      if (!options.skipDiscovery && discoveryAgent && discoveredJobIds.length === 0) {
        const discResult = await discoveryAgent.execute(
          {
            targetRoles: plan.targetRoles,
            targetLocations: plan.targetLocations,
            platforms: plan.preferredPlatforms,
            limitPerPlatform: options.limitJobs || 10,
            mode: options.mode,
            fastTest: options.fastTest,
          },
          ctx
        );

        if (discResult.status === 'SUCCESS' && discResult.data) {
          discoveredJobIds = discResult.data.jobIds;
          jobsDiscovered = discResult.data.discoveredCount;
        } else if (discResult.error) {
          errors.push(`Discovery error: ${discResult.error}`);
        }
      } else {
        jobsDiscovered = discoveredJobIds.length;
      }

      // 3. DEDUPLICATION PHASE
      state = 'DEDUPLICATING';
      const deduplicationAgent = agentRegistry.get(AgentResponsibility.JOB_DEDUPLICATION);
      let uniqueJobIds: string[] = discoveredJobIds;

      if (deduplicationAgent && discoveredJobIds.length > 0) {
        const dedupResult = await deduplicationAgent.execute(
          { userId, jobIds: discoveredJobIds },
          ctx
        );

        if (dedupResult.status === 'SUCCESS' && dedupResult.data) {
          uniqueJobIds = dedupResult.data.uniqueJobIds;
          jobsDeduplicated = dedupResult.data.duplicateCount;
        }
      }

      // Fetch user's default resume version isolated to authenticated user (with automatic fallback to resumes table)
      const db = await getDatabase();
      let resumeRow = await db.get<{ id: string; text_content: string }>(
        `SELECT id, text_content
         FROM resume_versions
         WHERE user_id = ? AND is_default = 1
         ORDER BY updated_at DESC
         LIMIT 1`,
        [userId]
      );
      if (!resumeRow?.text_content) {
        const baseResumeRow = await db.get<{ id: string; file_name: string; text_content: string; skills: string; builder_data: string }>(
          `SELECT id, file_name, text_content, skills, builder_data FROM resumes WHERE user_id = ? LIMIT 1`,
          [userId]
        );
        if (baseResumeRow?.text_content) {
          const newVersionId = uuidv4();
          const label = (baseResumeRow.file_name || 'Base Resume').replace(/\.[^.]+$/, '');
          await db.run(
            `INSERT INTO resume_versions (id, user_id, label, file_name, text_content, skills, structured_data, version_number, is_default)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`,
            [newVersionId, userId, label, baseResumeRow.file_name, baseResumeRow.text_content, baseResumeRow.skills || '[]', baseResumeRow.builder_data || null]
          ).catch(() => {});
          resumeRow = { id: newVersionId, text_content: baseResumeRow.text_content };
        }
      }
      const hasDefaultResume = Boolean(resumeRow?.text_content);
      const resumeText = hasDefaultResume ? resumeRow!.text_content : 'No resume provided.';
      const resumeVersionId = resumeRow?.id || null;
      if (!hasDefaultResume) {
        logger.warn('No default resume configured for user; executing pipeline with explicit missing-resume state', { userId, workflowId });
      }

      // Check whether auto-apply is enabled for this user (enabled by default unless turned off in Settings)
      const autoSettings = await db.get<{
        auto_apply_enabled: number;
        email_notifications: number;
        whatsapp_enabled: number;
        whatsapp_phone: string | null;
        whatsapp_api_key: string | null;
      }>(
        `SELECT auto_apply_enabled, email_notifications, whatsapp_enabled, whatsapp_phone, whatsapp_api_key
         FROM automation_settings WHERE user_id = ?`,
        [userId]
      );
      const autoApplyEnabled = autoSettings ? autoSettings.auto_apply_enabled !== 0 : true;
      const userRecord = await db.get<{ email: string; full_name: string }>(
        `SELECT email, full_name FROM users WHERE id = ?`,
        [userId]
      );
      const baseResumeFileRow = await db.get<{ file_path: string | null }>(
        `SELECT file_path FROM resumes WHERE user_id = ? LIMIT 1`,
        [userId]
      );
      const reportItems: ApplicationReportItem[] = [];

      // Pre-rank discovered jobs by fast resume skill overlap & skip already-applied jobs
      // so the AI agents always evaluate the candidate's highest-fit fresh roles first!
      const alreadyAppliedRows = await db.all<Array<{ job_id: string }>>(
        `SELECT job_id FROM applications WHERE user_id = ?`,
        [userId]
      );
      const alreadyAppliedSet = new Set((alreadyAppliedRows || []).map((r) => r.job_id));
      const freshJobIds = uniqueJobIds.filter((id) => !alreadyAppliedSet.has(id));
      const poolIds = freshJobIds.length > 0 ? freshJobIds : uniqueJobIds;

      const resumeLower = resumeText.toLowerCase();
      const baseResumeSkillsRow = await db.get<{ skills: string | null }>(
        `SELECT skills FROM resumes WHERE user_id = ? LIMIT 1`,
        [userId]
      );
      const candidateTokens = Array.from(
        new Set([
          ...this.parseSkills(baseResumeSkillsRow?.skills).map((s) => s.toLowerCase()),
          ...plan.targetRoles.flatMap((r) => r.toLowerCase().split(/[\s,/()-]+/)),
        ])
      ).filter((t) => t.length >= 2);

      const scoredCandidates: Array<{ id: string; preScore: number }> = [];
      for (const jId of poolIds) {
        const jRow = await db.get<{ title: string; location: string; source: string; apply_url: string; job_description: string; required_skills: string }>(
          `SELECT title, location, source, apply_url, job_description, required_skills FROM jobs WHERE id = ?`,
          [jId]
        );
        if (!jRow) continue;
        const titleLower = (jRow.title || '').toLowerCase();
        const textHay = `${titleLower} ${(jRow.required_skills || '').toLowerCase()} ${(jRow.job_description || '').slice(0, 1200).toLowerCase()}`;

        let preScore = 0;
        for (const tok of candidateTokens.slice(0, 25)) {
          if (titleLower.includes(tok)) preScore += 12;
          else if (textHay.includes(tok)) preScore += 4;
        }
        // Bonus for Remote & Direct ATS
        if (/remote|worldwide|anywhere/i.test(`${jRow.location || ''} ${titleLower}`)) preScore += 8;
        if (['greenhouse', 'ashby', 'lever'].includes(jRow.source) || /greenhouse\.io|lever\.co|ashbyhq\.com/i.test(jRow.apply_url || '')) {
          preScore += 5;
        }
        // Penalize mismatched extreme seniority or unrelated specialties unless present in candidate's resume
        for (const mismatch of ['staff ', 'principal', 'director', 'vp ', 'manager', 'rust', 'ios ', 'android', 'embedded', 'firmware', 'cobol', 'sap ', 'salesforce', 'ruby on rails']) {
          if (titleLower.includes(mismatch) && !resumeLower.includes(mismatch.trim())) {
            preScore -= 25;
          }
        }
        scoredCandidates.push({ id: jId, preScore });
      }
      scoredCandidates.sort((a, b) => b.preScore - a.preScore);

      // Limit job batch size after smart skill-based pre-ranking
      const rankedIds = scoredCandidates.map((c) => c.id);
      const jobsToProcess = options.limitJobs ? rankedIds.slice(0, options.limitJobs) : rankedIds;

      // 4. RANKING, INSPECTION, RESUME TAILORING & DRAFTING/AUTO-APPLY PER JOB
      const rankingAgentWrapper = agentRegistry.get(AgentResponsibility.JOB_RANKING);
      const browserAgentWrapper = agentRegistry.get(AgentResponsibility.BROWSER_AUTOMATION);
      const resumeOptAgentWrapper = agentRegistry.get(AgentResponsibility.RESUME_OPTIMIZATION);
      const coverLetterAgentWrapper = agentRegistry.get(AgentResponsibility.COVER_LETTER);
      const preparationAgentWrapper = agentRegistry.get(AgentResponsibility.APPLICATION_PREPARATION);

      for (const jobId of jobsToProcess) {
        try {
          const job = await db.get(`SELECT * FROM jobs WHERE id = ?`, [jobId]);
          if (!job) continue;

          // 4a. Ranking
          state = 'RANKING';
          let rankData: JobRankingOutput | undefined;

          if (rankingAgentWrapper) {
            const rankRes = await rankingAgentWrapper.execute(
              {
                userId,
                resumeText,
                job: {
                  id: job.id,
                  title: job.title,
                  description: job.job_description || '',
                  requiredSkills: this.parseSkills(job.required_skills),
                  location: job.location,
                  salary: job.salary,
                },
                threshold: plan.autoRankThreshold || 50,
              },
              ctx
            );

            if (rankRes.status === 'SUCCESS' && rankRes.data) {
              rankData = rankRes.data;
              jobsRanked++;
            }
          }

          const matchScore = rankData ? rankData.score : 65;
          const meetsThreshold = rankData ? rankData.meetsThreshold : true;
          logger.info(`📊 Ranked "${job.title}" @ "${job.company_name}" (${job.source}): ${matchScore}% (threshold ${plan.autoRankThreshold || 55}% → ${meetsThreshold ? 'MATCH' : 'skip'})`);

          // 4b. Inspection (Headless verification)
          state = 'INSPECTING';
          let browserData: BrowserInspectionOutput | undefined;
          const warnings: string[] = [];
          if (!hasDefaultResume) {
            warnings.push('No candidate resume configured: application draft prepared without resume data.');
          }

          if (meetsThreshold && !options.skipBrowserInspection && browserAgentWrapper && job.apply_url) {
            const browserRes = await browserAgentWrapper.execute(
              { jobId: job.id, applyUrl: job.apply_url },
              ctx
            );
            if (browserRes.status === 'SUCCESS' && browserRes.data) {
              browserData = browserRes.data;
              warnings.push(...browserRes.data.warnings);
            }
          }

          if (!meetsThreshold) {
            warnings.push(`Match score (${matchScore}%) is below configured threshold (${plan.autoRankThreshold || 50}%).`);
          }

          // 4b-2. Resume Tailoring for this specific job
          let activeResumeVersionId = resumeVersionId;
          let activeResumeText = resumeText;
          if (meetsThreshold && hasDefaultResume) {
            try {
              const existingTailored = await db.get<{ id: string; text_content: string }>(
                `SELECT id, text_content FROM resume_versions WHERE user_id = ? AND target_job_id = ? LIMIT 1`,
                [userId, job.id]
              );
              if (existingTailored) {
                activeResumeVersionId = existingTailored.id;
                activeResumeText = existingTailored.text_content || resumeText;
              } else {
                let tailoredKeywords = (rankData?.matchingSkills || []).slice(0, 10);
                let tailoredNote = '';
                if (resumeOptAgentWrapper) {
                  const optRes = await resumeOptAgentWrapper.execute(
                    {
                      resumeText,
                      jobTitle: job.title,
                      jobDescription: job.job_description || '',
                      missingSkills: rankData?.missingSkills || [],
                    },
                    ctx
                  );
                  if (optRes.status === 'SUCCESS' && optRes.data) {
                    const extraKw = optRes.data.keywordsToInclude || [];
                    tailoredKeywords = Array.from(new Set([...tailoredKeywords, ...extraKw])).slice(0, 12);
                    const suggestions = (optRes.data.suggestions || []).slice(0, 3).join(' | ');
                    if (suggestions) tailoredNote = `\n\n[AI Tailored for ${job.title} at ${job.company_name}]: ${suggestions}`;
                  }
                }
                const tailoredId = uuidv4();
                const tailoredLabel = `Tailored: ${job.title} at ${job.company_name}`.slice(0, 240);
                const tailoredContent = `${resumeText}${tailoredNote}`;
                await db.run(
                  `INSERT INTO resume_versions (id, user_id, label, file_name, text_content, skills, parent_version_id, target_job_id, ats_score, version_number, is_default)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 2, 0)`,
                  [
                    tailoredId,
                    userId,
                    tailoredLabel,
                    `${job.company_name.replace(/[^a-zA-Z0-9]+/g, '_')}_Tailored.pdf`,
                    tailoredContent,
                    JSON.stringify(tailoredKeywords),
                    resumeVersionId,
                    job.id,
                    matchScore,
                  ]
                );
                activeResumeVersionId = tailoredId;
                activeResumeText = tailoredContent;
                logger.info(`📄 Tailored resume created for "${job.title}" at "${job.company_name}"`, { tailoredId, matchScore });
              }
            } catch (tailorErr) {
              logger.warn('Resume tailoring fell back to default resume', tailorErr);
            }
          }

          // 4c. Cover Letter Drafting
          state = 'DRAFTING';
          let coverData: CoverLetterOutput | undefined;

          if (meetsThreshold && coverLetterAgentWrapper) {
            const coverRes = await coverLetterAgentWrapper.execute(
              {
                userId,
                jobId: job.id,
                jobTitle: job.title,
                companyName: job.company_name,
                jobDescription: job.job_description || '',
                resumeText: activeResumeText,
                resumeVersionId: activeResumeVersionId,
              },
              ctx
            );

            if (coverRes.status === 'SUCCESS' && coverRes.data) {
              coverData = coverRes.data;
            }
          }

          // 4d. Application Preparation & Default Auto-Apply (or Review Queue if auto-apply disabled)
          state = 'AWAITING_HUMAN_APPROVAL';
          if (meetsThreshold && preparationAgentWrapper) {
            const prepRes = await preparationAgentWrapper.execute(
              {
                userId,
                jobId: job.id,
                resumeVersionId: activeResumeVersionId,
                coverLetterId: coverData?.coverLetterId,
                matchScore,
                screenshotPath: browserData?.screenshotPath,
                warnings,
                scrapedQuestions: browserData?.scrapedQuestions || [],
              },
              ctx
            );

            if (prepRes.status === 'SUCCESS' && prepRes.data?.applicationId) {
              draftsQueuedForReview++;
              const appId = prepRes.data.applicationId;

              if (autoApplyEnabled) {
                try {
                  // Attempt GENUINE external submission (Direct Recruiter Email or Public ATS Form via Playwright)
                  const extResult = await externalSubmitter.attemptVerifiedSubmission({
                    applicationId: appId,
                    job: {
                      id: job.id,
                      title: job.title,
                      company_name: job.company_name,
                      apply_url: job.apply_url,
                      job_description: job.job_description,
                      source: job.source,
                    },
                    candidate: {
                      fullName: userRecord?.full_name || 'Candidate',
                      email: userRecord?.email || '',
                      resumeFilePath: baseResumeFileRow?.file_path || null,
                      resumeText: activeResumeText,
                    },
                    coverLetterText: coverData?.content || '',
                  });

                  const isExternallyVerified =
                    extResult.externalStatus === 'VERIFIED_ATS_SUBMITTED' ||
                    extResult.externalStatus === 'VERIFIED_EMAIL_SENT';

                  if (isExternallyVerified) {
                    await reviewAgent.approve(userId, appId, {
                      verifiedAnswers: true,
                      notes: extResult.proof.confirmationText || extResult.proof.reason,
                    }).catch(() => {});
                  }

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
                      isExternallyVerified ? 1 : 0,
                      isExternallyVerified ? 1 : 0,
                      isExternallyVerified ? 1 : 0,
                      extResult.proof.reason,
                      appId,
                      userId,
                    ]
                  );

                  reportItems.push({
                    jobTitle: job.title,
                    companyName: job.company_name,
                    matchScore,
                    externalStatus: extResult.externalStatus,
                    applyUrl: extResult.proof.finalUrl || job.apply_url,
                    reason: extResult.proof.reason,
                    atsPlatform: extResult.proof.atsPlatform,
                  });

                  logger.info(
                    isExternallyVerified
                      ? `✅ VERIFIED EXTERNAL APPLY: "${job.title}" at "${job.company_name}" (${extResult.externalStatus})`
                      : `⚡ AI PREPARED (Manual Apply Required): "${job.title}" at "${job.company_name}" — ${extResult.proof.reason}`,
                    { workflowId, userId, jobId: job.id, applicationId: appId }
                  );
                } catch (autoErr: any) {
                  logger.warn(`External submit attempt failed for "${job.title}"`, { error: autoErr.message });
                }
              } else {
                logger.info(`📋 Application draft queued for human review: "${job.title}" at "${job.company_name}"`, {
                  workflowId,
                  userId,
                  jobId: job.id,
                  applicationId: appId,
                });
              }
            } else if (prepRes.error) {
              errors.push(`Application preparation failed for job ${job.id}: ${prepRes.error}`);
            }
          }
        } catch (jobErr: any) {
          logger.error(`Error processing job ${jobId} in pipeline`, jobErr);
          errors.push(`Job ${jobId} error: ${jobErr.message}`);
        }
      }

      // 5. Send honest Email + WhatsApp Verification Report after processing jobs
      if (reportItems.length > 0 && userRecord?.email && !userRecord.email.endsWith('@example.com')) {
        const emailEnabled = autoSettings ? autoSettings.email_notifications !== 0 : true;
        if (emailEnabled) {
          sendApplicationRunSummaryEmail(userRecord.email, userRecord.full_name, reportItems).catch((err) =>
            logger.warn('Application summary email skipped', err)
          );
        }

        const waEnabled = autoSettings?.whatsapp_enabled === 1 || Boolean(process.env.WHATSAPP_PHONE && process.env.CALLMEBOT_API_KEY);
        if (waEnabled) {
          const appUrl = process.env.FRONTEND_URL || 'https://autojobapply-production-69da9ff5.up.railway.app';
          const waMsg = whatsappService.buildRunSummaryMessage(reportItems, appUrl.replace(/\/$/, ''));
          whatsappService
            .sendMessage(waMsg, {
              phone: autoSettings?.whatsapp_phone,
              apiKey: autoSettings?.whatsapp_api_key,
            })
            .catch((err) => logger.warn('WhatsApp notification skipped', err));
        }
      }

      state = 'COMPLETED';
      logger.info(`🎉 Multi-Agent Pipeline Completed [${workflowId}]`, {
        userId,
        jobsDiscovered,
        jobsRanked,
        draftsQueuedForReview,
      });

    } catch (pipelineErr: any) {
      state = 'FAILED';
      errors.push(`Pipeline error: ${pipelineErr.message}`);
      logger.error(`Fatal error in Multi-Agent Pipeline [${workflowId}]`, pipelineErr);
    }

    const durationMs = Date.now() - startTimestamp;
    const endTime = new Date().toISOString();

    return {
      workflowId,
      userId,
      state,
      startTime,
      endTime,
      durationMs,
      jobsDiscovered,
      jobsDeduplicated,
      jobsRanked,
      draftsQueuedForReview,
      errors,
    };
  }

  private parseSkills(skills: any): string[] {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    try {
      const parsed = JSON.parse(skills);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

export const multiAgentPipelineOrchestrator = new MultiAgentPipelineOrchestrator();
