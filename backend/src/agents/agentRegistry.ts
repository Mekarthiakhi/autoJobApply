import {
  AgentContract,
  AgentResponsibility,
  AgentContext,
  AgentResult,
  JobDiscoveryInput,
  JobDiscoveryOutput,
  DeduplicationInput,
  DeduplicationOutput,
  JobRankingInput,
  JobRankingOutput,
  BrowserInspectionInput,
  BrowserInspectionOutput,
  ResumeAnalysisInput,
  ResumeAnalysisOutput,
  ResumeOptimizationInput,
  ResumeOptimizationOutput,
  CoverLetterInput,
  CoverLetterOutput,
  ApplicationPreparationInput,
  ApplicationPreparationOutput,
  ApplicationReviewInput,
  ApplicationReviewOutput,
  NotificationInput,
  NotificationOutput,
  AnalyticsInput,
  AnalyticsOutput,
} from './contracts.js';
import { logger } from '../utils/logger.js';
import { getDatabase } from '../config/database.js';
import { JobRepository } from '../repositories/jobRepository.js';
import { ActivityLogRepository } from '../repositories/activityLogRepository.js';
import { plannerAgent } from '../services/plannerAgent.js';
import { rankingAgent } from '../services/rankingAgent.js';
import { browserAgent } from '../services/browserAgent.js';
import { resumeService } from '../services/resumeService.js';
import { aiMatchingService } from '../services/aiMatchingService.js';
import { coverLetterAgent } from '../services/coverLetterAgent.js';
import { reviewAgent } from '../services/reviewAgent.js';
import { emailService } from '../services/emailService.js';
import { telegramService } from '../services/telegramService.js';
import { linkedinScraper } from '../scrapers/linkedinScraper.js';
import { indeedScraper } from '../scrapers/indeedScraper.js';
import { naukriScraper } from '../scrapers/naukriScraper.js';
import { multiPortalAggregator } from '../discovery/multiPortalAggregator.js';
import { v4 as uuidv4 } from 'uuid';

const jobRepository = new JobRepository();
const activityLogRepository = new ActivityLogRepository();

// Helper to wrap execution safely
async function executeSafely<T>(
  agentName: string,
  responsibility: AgentResponsibility,
  ctx: AgentContext,
  fn: () => Promise<T>
): Promise<AgentResult<T>> {
  const startTime = Date.now();
  try {
    const data = await fn();
    const durationMs = Date.now() - startTime;

    // Log success in activity log if user context is available
    if (ctx.userId && ctx.userId !== 'system') {
      await activityLogRepository.create(ctx.userId, `agent_${agentName.toLowerCase()}_success`, {
        details: { responsibility, durationMs, workflowId: ctx.workflowId },
        status: 'success',
      }).catch(() => {});
    }

    return {
      status: 'SUCCESS',
      data,
      durationMs,
      retriesAttempted: 0,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    logger.error(`Agent execution failed: ${agentName}`, { error: err.message, responsibility });

    if (ctx.userId && ctx.userId !== 'system') {
      await activityLogRepository.create(ctx.userId, `agent_${agentName.toLowerCase()}_failed`, {
        details: { responsibility, error: err.message, workflowId: ctx.workflowId },
        status: 'failed',
      }).catch(() => {});
    }

    return {
      status: 'FAILED',
      error: err.message || 'Unknown error',
      durationMs,
      retriesAttempted: 0,
    };
  }
}

// 1. Job Discovery Agent
export class JobDiscoveryAgentWrapper implements AgentContract<JobDiscoveryInput, JobDiscoveryOutput> {
  readonly name = 'JobDiscoveryAgent';
  readonly responsibility = AgentResponsibility.JOB_DISCOVERY;

  async execute(input: JobDiscoveryInput, ctx: AgentContext): Promise<AgentResult<JobDiscoveryOutput>> {
    return executeSafely(this.name, this.responsibility, ctx, async () => {
      const role = input.targetRoles[0] || 'React Developer';
      const limitPerPortal = Math.min(Math.max(input.limitPerPlatform || 5, 3), 10);

      // Query all active live job portals in parallel (Remotive, RemoteOK, Jobicy, Arbeitnow, Himalayas + JSearch/Adzuna/Jooble if configured)
      const { jobs: allJobs } = await multiPortalAggregator.discoverAllPortals({
        role,
        keywords: input.targetRoles,
        locations: input.targetLocations,
        limitPerPortal,
      });

      // Optional Playwright scrapers only if all HTTP portals yielded 0 results
      if (allJobs.length === 0 && !input.fastTest && input.mode !== 'test') {
        const location = input.targetLocations[0] || 'Remote';
        if (input.platforms.includes('linkedin')) {
          try {
            const jobs = await linkedinScraper.searchJobs([role], location);
            allJobs.push(...(jobs as any[]));
          } catch (err: any) {
            logger.warn('LinkedIn discovery skipped', { error: err.message });
          }
        }
        if (input.platforms.includes('indeed')) {
          try {
            const jobs = await indeedScraper.searchJobs([role], location);
            allJobs.push(...(jobs as any[]));
          } catch (err: any) {
            logger.warn('Indeed discovery skipped', { error: err.message });
          }
        }
        if (input.platforms.includes('naukri')) {
          try {
            const jobs = await naukriScraper.searchJobs([role], location);
            allJobs.push(...(jobs as any[]));
          } catch (err: any) {
            logger.warn('Naukri discovery skipped', { error: err.message });
          }
        }
      }

      // Final fallback: reuse existing real jobs from repository
      if (allJobs.length === 0) {
        const searchKeyword = role.split(/\s+/)[0] || 'React';
        const existingJobs = await jobRepository.findByKeywords([searchKeyword], limitPerPortal * 2);
        allJobs.push(...(existingJobs as any[]));
      }

      const jobIds: string[] = [];
      let newJobsSaved = 0;

      for (const job of allJobs) {
        try {
          const existing = await jobRepository.findByExternalId(job.source, job.external_id);
          if (!existing) {
            const saved = await jobRepository.create(job);
            jobIds.push(saved.id);
            newJobsSaved++;
          } else {
            jobIds.push(existing.id);
          }
        } catch (e) {
          logger.error('Failed to save discovered job', e);
        }
      }

      return {
        discoveredCount: allJobs.length,
        newJobsSaved,
        jobIds,
      };
    });
  }
}

// 2. Job Normalization & Deduplication Agent
export class JobDeduplicationAgentWrapper implements AgentContract<DeduplicationInput, DeduplicationOutput> {
  readonly name = 'JobDeduplicationAgent';
  readonly responsibility = AgentResponsibility.JOB_DEDUPLICATION;

  async execute(input: DeduplicationInput, ctx: AgentContext): Promise<AgentResult<DeduplicationOutput>> {
    return executeSafely(this.name, this.responsibility, ctx, async () => {
      const uniqueJobIds = await plannerAgent.filterDuplicates(input.userId, input.jobIds);
      return {
        totalChecked: input.jobIds.length,
        duplicateCount: input.jobIds.length - uniqueJobIds.length,
        uniqueJobIds,
      };
    });
  }
}

// 3. Job Ranking and Matching Agent
export class JobRankingAgentWrapper implements AgentContract<JobRankingInput, JobRankingOutput> {
  readonly name = 'JobRankingAgent';
  readonly responsibility = AgentResponsibility.JOB_RANKING;

  async execute(input: JobRankingInput, ctx: AgentContext): Promise<AgentResult<JobRankingOutput>> {
    return executeSafely(this.name, this.responsibility, ctx, async () => {
      const result = await rankingAgent.scoreJob(
        input.resumeText,
        input.job.description,
        input.job.title,
        input.job.requiredSkills || [],
        undefined,
        input.job.location,
        undefined,
        input.job.salary
      );

      const threshold = input.threshold ?? 50;

      // Persist score to match_scores so Jobs, Companies, and Dashboard display real AI scores
      try {
        const db = await getDatabase();
        await db.run(
          `INSERT INTO match_scores (user_id, job_id, match_score, missing_skills, matching_skills, strengths, recommendation, analyzed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, job_id) DO UPDATE SET
             match_score = excluded.match_score,
             missing_skills = excluded.missing_skills,
             matching_skills = excluded.matching_skills,
             strengths = excluded.strengths,
             recommendation = excluded.recommendation,
             analyzed_at = CURRENT_TIMESTAMP`,
          [
            input.userId,
            input.job.id,
            result.score,
            JSON.stringify(result.missingSkills || []),
            JSON.stringify(result.matchingSkills || []),
            JSON.stringify(result.strengths || []),
            result.recommendation || 'consider',
          ]
        );
      } catch (scoreSaveErr) {
        logger.warn('Failed to persist match score', scoreSaveErr);
      }

      return {
        jobId: input.job.id,
        score: result.score,
        recommendation: result.recommendation,
        matchingSkills: result.matchingSkills,
        missingSkills: result.missingSkills,
        strengths: result.strengths,
        breakdown: result.breakdown,
        meetsThreshold: result.score >= threshold,
      };
    });
  }
}

// 4. Company Research & Browser Inspection Agent
export class BrowserAutomationAgentWrapper implements AgentContract<BrowserInspectionInput, BrowserInspectionOutput> {
  readonly name = 'BrowserAutomationAgent';
  readonly responsibility = AgentResponsibility.BROWSER_AUTOMATION;

  async execute(input: BrowserInspectionInput, ctx: AgentContext): Promise<AgentResult<BrowserInspectionOutput>> {
    return executeSafely(this.name, this.responsibility, ctx, async () => {
      const res = await browserAgent.inspectJobPage(input.applyUrl, input.jobId);
      const hasLoginWall = res.warnings.some(w => w.toLowerCase().includes('login') || w.toLowerCase().includes('sign in'));
      return {
        jobId: input.jobId,
        pageTitle: res.pageTitle,
        screenshotPath: res.screenshotPath,
        scrapedQuestions: res.scrapedQuestions,
        hasLoginWall,
        warnings: res.warnings,
      };
    });
  }
}

// 5. Resume Analysis Agent
export class ResumeAnalysisAgentWrapper implements AgentContract<ResumeAnalysisInput, ResumeAnalysisOutput> {
  readonly name = 'ResumeAnalysisAgent';
  readonly responsibility = AgentResponsibility.RESUME_ANALYSIS;

  async execute(input: ResumeAnalysisInput, ctx: AgentContext): Promise<AgentResult<ResumeAnalysisOutput>> {
    return executeSafely(this.name, this.responsibility, ctx, async () => {
      const data = await resumeService.extractResumeData(input.textContent);
      return data;
    });
  }
}

// 6. Resume Optimization Agent
export class ResumeOptimizationAgentWrapper implements AgentContract<ResumeOptimizationInput, ResumeOptimizationOutput> {
  readonly name = 'ResumeOptimizationAgent';
  readonly responsibility = AgentResponsibility.RESUME_OPTIMIZATION;

  async execute(input: ResumeOptimizationInput, ctx: AgentContext): Promise<AgentResult<ResumeOptimizationOutput>> {
    return executeSafely(this.name, this.responsibility, ctx, async () => {
      const opt = await aiMatchingService.optimizeResume(input.resumeContent, input.jobDescription);
      return opt;
    });
  }
}

// 7. Cover Letter Agent
export class CoverLetterAgentWrapper implements AgentContract<CoverLetterInput, CoverLetterOutput> {
  readonly name = 'CoverLetterAgent';
  readonly responsibility = AgentResponsibility.COVER_LETTER;

  async execute(input: CoverLetterInput, ctx: AgentContext): Promise<AgentResult<CoverLetterOutput>> {
    return executeSafely(this.name, this.responsibility, ctx, async () => {
      const content = await coverLetterAgent.generateCoverLetter(
        input.resumeText,
        input.jobDescription,
        input.jobTitle,
        input.companyName
      );

      let coverLetterId: string | undefined = undefined;
      // If user id is provided and not a dry run, persist to database
      if (input.userId && !ctx.dryRun) {
        const db = await getDatabase();
        const newCoverId = uuidv4();
        await db.run(
          `INSERT INTO cover_letters (id, user_id, job_id, resume_version_id, content) VALUES (?, ?, ?, ?, ?)`,
          [newCoverId, input.userId, input.jobId, input.resumeVersionId || null, content]
        );
        coverLetterId = newCoverId;
      }

      return {
        coverLetterId,
        content,
        wordCount: content.split(/\s+/).filter(Boolean).length,
      };
    });
  }
}

// 8. Application Preparation Agent
export class ApplicationPreparationAgentWrapper implements AgentContract<ApplicationPreparationInput, ApplicationPreparationOutput> {
  readonly name = 'ApplicationPreparationAgent';
  readonly responsibility = AgentResponsibility.APPLICATION_PREPARATION;

  async execute(input: ApplicationPreparationInput, ctx: AgentContext): Promise<AgentResult<ApplicationPreparationOutput>> {
    return executeSafely(this.name, this.responsibility, ctx, async () => {
      // Route directly into Review Queue enforcing human-in-the-loop safety
      const applicationId = await reviewAgent.queueForReview(input.userId, input.jobId, {
        matchScore: input.matchScore,
        resumeVersionId: input.resumeVersionId || undefined,
        coverLetterId: input.coverLetterId || undefined,
        screenshotPath: input.screenshotPath || undefined,
        warnings: input.warnings,
        scrapedQuestions: input.scrapedQuestions,
      });

      return {
        applicationId,
        status: 'pending',
        reviewStatus: 'pending',
        queuedAt: new Date().toISOString(),
      };
    });
  }
}

// 9. Application Review Agent
export class ApplicationReviewAgentWrapper implements AgentContract<ApplicationReviewInput, ApplicationReviewOutput> {
  readonly name = 'ApplicationReviewAgent';
  readonly responsibility = AgentResponsibility.APPLICATION_REVIEW;

  async execute(input: ApplicationReviewInput, ctx: AgentContext): Promise<AgentResult<ApplicationReviewOutput>> {
    return executeSafely(this.name, this.responsibility, ctx, async () => {
      if (input.action === 'approve') {
        if (!input.explicitUserConfirmation) {
          throw new Error('Explicit human approval is strictly required before an application can be approved.');
        }
        await reviewAgent.approve(input.userId, input.applicationId, {
          verifiedAnswers: true,
          notes: input.notes,
        });
        return {
          applicationId: input.applicationId,
          status: 'approved',
          reviewStatus: 'approved',
          decidedAt: new Date().toISOString(),
        };
      } else {
        await reviewAgent.reject(input.userId, input.applicationId, input.notes);
        return {
          applicationId: input.applicationId,
          status: 'rejected',
          reviewStatus: 'rejected',
          decidedAt: new Date().toISOString(),
        };
      }
    });
  }
}

// 10. Notification Agent
export class NotificationAgentWrapper implements AgentContract<NotificationInput, NotificationOutput> {
  readonly name = 'NotificationAgent';
  readonly responsibility = AgentResponsibility.NOTIFICATION;

  async execute(input: NotificationInput, ctx: AgentContext): Promise<AgentResult<NotificationOutput>> {
    return executeSafely(this.name, this.responsibility, ctx, async () => {
      let emailSent = false;
      let telegramSent = false;

      if (input.recipientEmail) {
        try {
          await emailService.sendEmail(
            input.recipientEmail,
            `Notification: ${input.type}`,
            `<p>${JSON.stringify(input.payload)}</p>`
          );
          emailSent = true;
        } catch (e) {
          logger.warn('Failed to send email notification', e);
        }
      }

      if (input.telegramChatId) {
        try {
          telegramSent = await telegramService.sendNotification(
            input.telegramChatId,
            `<b>${input.type}</b>\n${JSON.stringify(input.payload)}`
          );
        } catch (e) {
          logger.warn('Failed to send telegram notification', e);
        }
      }

      return {
        emailSent,
        telegramSent,
        timestamp: new Date().toISOString(),
      };
    });
  }
}

// 11. Analytics & Reporting Agent
export class AnalyticsAgentWrapper implements AgentContract<AnalyticsInput, AnalyticsOutput> {
  readonly name = 'AnalyticsAgent';
  readonly responsibility = AgentResponsibility.ANALYTICS;

  async execute(input: AnalyticsInput, ctx: AgentContext): Promise<AgentResult<AnalyticsOutput>> {
    return executeSafely(this.name, this.responsibility, ctx, async () => {
      const db = await getDatabase();
      const stats = await db.get(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN review_status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN interview_scheduled = 1 THEN 1 ELSE 0 END) as interviews,
          SUM(CASE WHEN offer_received = 1 THEN 1 ELSE 0 END) as offers
         FROM applications WHERE user_id = ?`,
        [input.userId]
      );

      const total = stats?.total || 0;
      const approved = stats?.approved || 0;
      const conversionRate = total > 0 ? Math.round((approved / total) * 100) : 0;

      return {
        totalApplications: total,
        pendingReview: stats?.pending || 0,
        approved,
        rejected: stats?.rejected || 0,
        interviews: stats?.interviews || 0,
        offers: stats?.offers || 0,
        conversionRate,
      };
    });
  }
}

// Central Agent Registry
export class AgentRegistry {
  private agents: Map<AgentResponsibility, AgentContract> = new Map();

  constructor() {
    this.register(new JobDiscoveryAgentWrapper());
    this.register(new JobDeduplicationAgentWrapper());
    this.register(new JobRankingAgentWrapper());
    this.register(new BrowserAutomationAgentWrapper());
    this.register(new ResumeAnalysisAgentWrapper());
    this.register(new ResumeOptimizationAgentWrapper());
    this.register(new CoverLetterAgentWrapper());
    this.register(new ApplicationPreparationAgentWrapper());
    this.register(new ApplicationReviewAgentWrapper());
    this.register(new NotificationAgentWrapper());
    this.register(new AnalyticsAgentWrapper());
  }

  register(agent: AgentContract): void {
    this.agents.set(agent.responsibility, agent);
  }

  get<TInput = any, TOutput = any>(responsibility: AgentResponsibility): AgentContract<TInput, TOutput> | undefined {
    return this.agents.get(responsibility) as AgentContract<TInput, TOutput> | undefined;
  }

  list(): { name: string; responsibility: AgentResponsibility }[] {
    return this.listRegistered();
  }

  listRegistered(): { name: string; responsibility: AgentResponsibility }[] {
    return Array.from(this.agents.values()).map(a => ({ name: a.name, responsibility: a.responsibility }));
  }
}

export const agentRegistry = new AgentRegistry();
