import { Request, Response } from 'express';
import { multiAgentPipelineOrchestrator } from '../agents/orchestratorPipeline.js';
import { agentRegistry } from '../agents/agentRegistry.js';
import { AppError } from '../middleware/errorHandler.js';
import { getDatabase } from '../config/database.js';

export async function getRunStatus(req: Request, res: Response) {
  try {
    const registered = agentRegistry.list();
    res.json({
      status: 'ready',
      message: 'Multi-Agent Execution Service is operational.',
      registeredAgentsCount: registered.length,
      availableAgents: registered.map((a: { name: string; responsibility: any }) => ({
        name: a.name,
        responsibility: a.responsibility,
        status: 'READY',
      })),
      usage: {
        method: 'POST',
        endpoint: '/api/agents/run',
        testEndpoint: '/api/agents/test-as-user',
        supportedModes: ['live', 'test', 'simulation'],
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve agent status' });
  }
}

export async function runWorkflow(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const options = {
      limitJobs: req.body?.limitJobs || 10,
      skipBrowserInspection: req.body?.skipBrowserInspection ?? Boolean(req.body?.sync),
      initialJobIds: req.body?.initialJobIds,
    };

    // If client requested synchronous execution (e.g. for testing / UI stepper)
    if (req.body?.sync) {
      const summary = await multiAgentPipelineOrchestrator.runPipeline(userId, options);
      return res.json({
        message: 'Multi-agent pipeline completed successfully.',
        summary,
      });
    }

    // Default asynchronous run
    multiAgentPipelineOrchestrator.runPipeline(userId, options).catch((err) => {
      console.error('Background multi-agent pipeline error:', err);
    });

    res.json({
      message: 'Workflow started in the background. Check your Activity Logs and Review Queue shortly.',
      status: 'STARTED',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Failed to start workflow:', error);
      res.status(500).json({ error: 'Failed to start workflow' });
    }
  }
}

export async function testAsUser(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const limitJobs = req.body?.limitJobs || 3;
    const summary = await multiAgentPipelineOrchestrator.runPipeline(userId, {
      limitJobs,
      skipBrowserInspection: req.body?.skipBrowserInspection ?? false,
      fastTest: req.body?.fastTest ?? true,
      mode: req.body?.mode || 'test',
    });

    res.json({
      success: true,
      message: `Agent test completed as user: ${summary.jobsRanked} jobs ranked, ${summary.draftsQueuedForReview} review drafts created.`,
      summary,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Test as user agent error:', error);
      res.status(500).json({ error: 'Failed to test agent as user' });
    }
  }
}

export async function listAgents(req: Request, res: Response) {
  try {
    const registered = agentRegistry.list();
    const agents = registered.map((a: { name: string; responsibility: any }) => ({
      name: a.name,
      responsibility: a.responsibility,
      status: 'Active',
      description: getAgentDescription(a.name),
      version: '1.2.0',
    }));

    // Check for user-created custom agents stored in DB
    const db = await getDatabase();
    const customRows = await db.all<any[]>(
      `SELECT * FROM user_agents WHERE user_id = ? ORDER BY created_at DESC`,
      [req.userId || 'system']
    ).catch(() => []);

    res.json({
      systemAgents: agents,
      customAgents: customRows || [],
      totalCount: agents.length + (customRows?.length || 0),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list agents' });
  }
}

export async function createCustomAgent(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { name, role, location, minMatchScore, autoApply, instructions } = req.body;
    if (!name || !role) {
      throw new AppError(400, 'Agent name and target role are required');
    }

    const db = await getDatabase();
    
    // Ensure user_agents table exists
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_agents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        location TEXT,
        min_match_score INTEGER DEFAULT 80,
        auto_apply INTEGER DEFAULT 0,
        instructions TEXT,
        status TEXT DEFAULT 'Ready',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const id = `agent-${Date.now()}`;
    await db.run(
      `INSERT INTO user_agents (id, user_id, name, role, location, min_match_score, auto_apply, instructions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, name, role, location || 'Remote', minMatchScore || 80, autoApply ? 1 : 0, instructions || '']
    );

    res.status(201).json({
      message: 'Custom agent created successfully',
      agent: {
        id,
        name,
        role,
        location,
        minMatchScore,
        autoApply,
        status: 'Ready',
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Create custom agent error:', error);
      res.status(500).json({ error: 'Failed to create custom agent' });
    }
  }
}

function getAgentDescription(name: string): string {
  switch (name) {
    case 'JobDiscoveryAgent':
      return 'Scans job boards (LinkedIn, Indeed, Naukri) and normalizes live openings into canonical format.';
    case 'JobDeduplicationAgent':
      return 'Removes duplicate postings across platforms and cross-references previously applied roles.';
    case 'JobRankingAgent':
      return 'Multi-factor ATS matching engine that evaluates resume compatibility against job requirements.';
    case 'BrowserAutomationAgent':
      return 'Inspects job application portals, captures preview screenshots, and extracts form questions.';
    case 'ResumeAnalysisAgent':
      return 'Extracts structured candidate skills, career timeline, and core competencies from resumes.';
    case 'ResumeOptimizationAgent':
      return 'Tailors candidate resume bullets and keywords to maximize ATS score for each specific role.';
    case 'CoverLetterAgent':
      return 'Generates personalized, high-converting cover letter drafts referencing relevant achievements.';
    case 'ApplicationReviewAgent':
      return 'Prepares Human-in-the-Loop review packages and enforces candidate approval before submission.';
    case 'NotificationAgent':
      return 'Alerts candidates via in-app dashboard and Telegram when reviews require human sign-off.';
    default:
      return 'Autonomous specialized pipeline worker.';
  }
}
