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

      // Fetch user's default resume version isolated to authenticated user
      const db = await getDatabase();
      const resumeRow = await db.get<{ id: string; text_content: string }>(
        `SELECT id, text_content
         FROM resume_versions
         WHERE user_id = ? AND is_default = 1
         ORDER BY updated_at DESC
         LIMIT 1`,
        [userId]
      );
      const hasDefaultResume = Boolean(resumeRow?.text_content);
      const resumeText = hasDefaultResume ? resumeRow!.text_content : 'No resume provided.';
      const resumeVersionId = resumeRow?.id || null;
      if (!hasDefaultResume) {
        logger.warn('No default resume configured for user; executing pipeline with explicit missing-resume state', { userId, workflowId });
      }

      // Limit job batch size if requested
      const jobsToProcess = options.limitJobs ? uniqueJobIds.slice(0, options.limitJobs) : uniqueJobIds;

      // 4. RANKING, INSPECTION & DRAFTING PER JOB
      const rankingAgentWrapper = agentRegistry.get(AgentResponsibility.JOB_RANKING);
      const browserAgentWrapper = agentRegistry.get(AgentResponsibility.BROWSER_AUTOMATION);
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
                resumeText,
                resumeVersionId,
              },
              ctx
            );

            if (coverRes.status === 'SUCCESS' && coverRes.data) {
              coverData = coverRes.data;
            }
          }

          // 4d. Application Preparation: Queue in Review Queue (MANDATORY HUMAN-IN-THE-LOOP BOUNDARY)
          state = 'AWAITING_HUMAN_APPROVAL';
          if (preparationAgentWrapper) {
            const prepRes = await preparationAgentWrapper.execute(
              {
                userId,
                jobId: job.id,
                resumeVersionId,
                coverLetterId: coverData?.coverLetterId,
                matchScore,
                screenshotPath: browserData?.screenshotPath,
                warnings,
                scrapedQuestions: browserData?.scrapedQuestions || [],
              },
              ctx
            );

            if (prepRes.status === 'SUCCESS') {
              draftsQueuedForReview++;
              logger.info(`📋 Application draft queued for human review: "${job.title}" at "${job.company_name}"`, {
                workflowId,
                userId,
                jobId: job.id,
                applicationId: prepRes.data?.applicationId,
              });
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
