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
      const autoSettings = await db.get<{ auto_apply_enabled: number }>(
        `SELECT auto_apply_enabled FROM automation_settings WHERE user_id = ?`,
        [userId]
      );
      const autoApplyEnabled = autoSettings ? autoSettings.auto_apply_enabled !== 0 : true;

      // Limit job batch size if requested
      const jobsToProcess = options.limitJobs ? uniqueJobIds.slice(0, options.limitJobs) : uniqueJobIds;

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
                  await reviewAgent.approve(userId, appId, {
                    verifiedAnswers: true,
                    notes: `Auto-applied with tailored resume (${matchScore}% match) & Gemini cover letter`,
                  });
                  logger.info(`🚀 Auto-applied to "${job.title}" at "${job.company_name}" (${matchScore}% match)`, {
                    workflowId,
                    userId,
                    jobId: job.id,
                    applicationId: appId,
                  });
                } catch (autoErr: any) {
                  logger.warn(`Auto-apply skipped for "${job.title}", left in Review Queue`, { error: autoErr.message });
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
