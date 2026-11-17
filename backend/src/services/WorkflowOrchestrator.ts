import { plannerAgent } from './plannerAgent.js';
import { rankingAgent } from './rankingAgent.js';
import { browserAgent } from './browserAgent.js';
import { coverLetterAgent } from './coverLetterAgent.js';
import { reviewAgent } from './reviewAgent.js';
import { linkedinScraper } from '../scrapers/linkedinScraper.js';
import { indeedScraper } from '../scrapers/indeedScraper.js';
import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { JobRepository } from '../repositories/jobRepository.js';

const jobRepository = new JobRepository();

export class WorkflowOrchestrator {
  /**
   * Run the full end-to-end multi-agent orchestration for a specific user
   */
  async runWorkflow(userId: string): Promise<void> {
    logger.info('🚀 Starting Multi-Agent Workflow', { agent: 'Orchestrator', userId });

    try {
      // 1. Plan the search
      const plan = await plannerAgent.buildPlan(userId);
      if (!plan.targetRoles.length) {
        logger.warn('No target roles defined, aborting workflow', { agent: 'Orchestrator', userId });
        return;
      }

      // 2. Discover Jobs
      let allJobs: any[] = [];
      const db = await getDatabase();
      
      // Let's use the first role for a simple run
      const searchRole = plan.targetRoles[0];
      const searchLocation = plan.targetLocations[0] || 'Remote';

      if (plan.preferredPlatforms.includes('linkedin')) {
        const jobs = await linkedinScraper.searchJobs([searchRole], searchLocation);
        allJobs = allJobs.concat(jobs);
      }

      if (plan.preferredPlatforms.includes('indeed')) {
        const jobs = await indeedScraper.searchJobs([searchRole], searchLocation);
        allJobs = allJobs.concat(jobs);
      }

      logger.info(`🔍 Job Discovery Complete. Found ${allJobs.length} jobs.`, { agent: 'Orchestrator', userId });

      // Save jobs to database if they don't exist
      const newJobIds: string[] = [];
      for (const job of allJobs) {
        try {
          const existing = await jobRepository.findByExternalId(job.source, job.external_id);
          if (!existing) {
            const savedJob = await jobRepository.create(job);
            newJobIds.push(savedJob.id);
          } else {
            newJobIds.push(existing.id);
          }
        } catch (error) {
          logger.error('Error saving job', error);
        }
      }

      // 3. Filter duplicates
      const uniqueJobIds = await plannerAgent.filterDuplicates(userId, newJobIds);
      if (uniqueJobIds.length === 0) {
        logger.info('No new unique jobs to process.', { agent: 'Orchestrator', userId });
        return;
      }

      // Get user's default resume scoped strictly to authenticated user
      const defaultResume = await db.get(
        `SELECT id, text_content FROM resume_versions WHERE user_id = ? AND is_default = 1`,
        [userId]
      );
      
      const resumeText = defaultResume?.text_content || 'No resume provided.';
      const resumeId = defaultResume?.id || null;
      if (!defaultResume) {
        logger.warn('Candidate has no default resume configured. Proceeding with baseline placeholder.', {
          agent: 'Orchestrator',
          userId,
        });
      }

      // 4. Rank and Process each job
      for (const jobId of uniqueJobIds) {
        const job = await db.get(`SELECT * FROM jobs WHERE id = ?`, [jobId]) as any;
        if (!job) continue;

        logger.info(`🤖 Ranking job ${job.title}...`, { agent: 'Orchestrator', userId });

        // Ranking
        const rankResult = await rankingAgent.scoreAndRank(resumeText, job.job_description, job.title);
        
        let coverLetterContent: string | null = null;
        let coverLetterId: string | null = null;
        let screenshotPath: string | null = null;
        let scrapedQuestions: string[] = [];
        const warnings: string[] = [];

        // If score is good enough (or no threshold set)
        if (rankResult.score >= (plan.autoRankThreshold || 50)) {
          // Browser Inspect (headless check)
          const browserResult = await browserAgent.inspectJobPage(job.apply_url, job.id);
          screenshotPath = browserResult.screenshotPath;
          scrapedQuestions = browserResult.scrapedQuestions;
          warnings.push(...browserResult.warnings);

          // Generate Cover Letter
          coverLetterContent = await coverLetterAgent.generateCoverLetter(resumeText, job.job_description, job.title, job.company_name);
          if (coverLetterContent) {
             const result = await db.run(
               `INSERT INTO cover_letters (user_id, job_id, content) VALUES (?, ?, ?)`,
               [userId, job.id, coverLetterContent]
             );
             coverLetterId = result.lastID?.toString() || null;
          }
        } else {
          warnings.push(`Match score (${rankResult.score}%) is below preferred threshold.`);
        }

        // 5. Safe Draft Preparation: Place EVERY application into the Review Queue
        // Enforce mandatory human-in-the-loop approval: AI agents prepare drafts, capture screenshots,
        // and extract questions, but NEVER submit applications autonomously.
        logger.info(`🛡️ [Safety Guard] Queuing application draft for human review: "${job.title}" (${rankResult.score}% match)`, {
          agent: 'Orchestrator',
          userId,
          jobId
        });

        const applicationId = await reviewAgent.queueForReview(userId, jobId, {
          matchScore: rankResult.score,
          resumeVersionId: resumeId,
          coverLetterId: coverLetterId || undefined,
          screenshotPath: screenshotPath || undefined,
          warnings,
          scrapedQuestions
        });

        logger.info(`📋 Application queued in Review Queue (ID: ${applicationId}). Awaiting explicit user approval.`, {
          agent: 'Orchestrator',
          userId,
          jobId
        });
      }

      logger.info('🎉 Workflow completed. All new job application drafts placed in Review Queue.', { agent: 'Orchestrator', userId });

    } catch (error) {
      logger.error('Workflow orchestrator failed', { agent: 'Orchestrator', userId, error });
    }
  }
}

export const workflowOrchestrator = new WorkflowOrchestrator();
