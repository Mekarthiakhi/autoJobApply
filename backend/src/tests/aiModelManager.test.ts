import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  aiModelManager,
  calculateCost,
  estimateTokens,
  MockProvider,
  GeminiProvider,
  OpenAIProvider,
  ClaudeProvider,
} from '../ai/index.js';
import { aiMatchingService } from '../services/aiMatchingService.js';
import { coverLetterAgent } from '../services/coverLetterAgent.js';

describe('Phase 6: AI Model Provider Architecture Tests', () => {

  describe('1. Cost Calculator & Token Estimation', () => {
    it('accurately calculates costs for Gemini models', () => {
      // gemini-1.5-flash: $0.075 input / 1M, $0.30 output / 1M
      const cost = calculateCost('gemini-1.5-flash', 1_000_000, 1_000_000);
      assert.strictEqual(cost, 0.375);

      // gemini-2.0-flash: $0.10 input / 1M, $0.40 output / 1M
      const cost2 = calculateCost('gemini-2.0-flash', 100_000, 50_000);
      // (100k / 1M) * 0.10 = 0.010; (50k / 1M) * 0.40 = 0.020; total = 0.03
      assert.strictEqual(cost2, 0.03);
    });

    it('accurately calculates costs for OpenAI models', () => {
      // gpt-4o-mini: $0.15 input / 1M, $0.60 output / 1M
      const cost = calculateCost('gpt-4o-mini', 1_000_000, 1_000_000);
      assert.strictEqual(cost, 0.75);

      // gpt-4o: $2.50 input / 1M, $10.00 output / 1M
      const cost2 = calculateCost('gpt-4o', 100_000, 10_000);
      // (100k / 1M) * 2.50 = 0.25; (10k / 1M) * 10.00 = 0.10; total = 0.35
      assert.strictEqual(cost2, 0.35);
    });

    it('accurately calculates costs for Claude models', () => {
      // claude-3-5-haiku-20241022: $0.80 input / 1M, $4.00 output / 1M
      const cost = calculateCost('claude-3-5-haiku-20241022', 1_000_000, 1_000_000);
      assert.strictEqual(cost, 4.8);
    });

    it('charges zero for mock / deterministic models', () => {
      const cost = calculateCost('mock-deterministic', 500_000, 500_000);
      assert.strictEqual(cost, 0);
    });

    it('estimates token count using character heuristic (~4 chars/token)', () => {
      assert.strictEqual(estimateTokens(''), 0);
      assert.strictEqual(estimateTokens('test'), 1);
      assert.strictEqual(estimateTokens('This is a test prompt containing around 56 characters!'), 14);
    });
  });

  describe('2. Provider Availability & Key Isolation', () => {
    it('verifies MockProvider is always available with zero credentials', () => {
      const mock = new MockProvider();
      assert.strictEqual(mock.isAvailable(), true);
      assert.strictEqual(mock.name, 'mock');
    });

    it('checks GeminiProvider availability safely without throwing', () => {
      const gemini = new GeminiProvider();
      assert.strictEqual(typeof gemini.isAvailable(), 'boolean');
      assert.strictEqual(gemini.name, 'gemini');
    });

    it('checks OpenAIProvider availability safely without throwing', () => {
      const openai = new OpenAIProvider();
      assert.strictEqual(typeof openai.isAvailable(), 'boolean');
      assert.strictEqual(openai.name, 'openai');
    });

    it('checks ClaudeProvider availability safely without throwing', () => {
      const claude = new ClaudeProvider();
      assert.strictEqual(typeof claude.isAvailable(), 'boolean');
      assert.strictEqual(claude.name, 'claude');
    });
  });

  describe('3. Deterministic Mock Provider Execution', () => {
    const mock = new MockProvider();

    it('generates deterministic job match analysis from prompt', async () => {
      const prompt = `
Analyze the following resume against the job description and provide match_score.
RESUME: Experienced Full Stack Engineer proficient in TypeScript, React, Node.js and SQL.
JOB TITLE: Senior Frontend Developer
REQUIRED SKILLS: React, TypeScript, GraphQL
JOB DESCRIPTION: We need a React expert with TypeScript experience.
`;
      const result = await mock.complete(prompt, { responseFormat: 'json' });

      assert.strictEqual(result.provider, 'mock');
      assert.strictEqual(result.model, 'mock-deterministic');
      assert.ok(result.parsed, 'Must have parsed JSON');
      assert.ok(typeof result.parsed.match_score === 'number');
      assert.ok(result.parsed.matching_skills.includes('React'));
      assert.ok(result.parsed.matching_skills.includes('TypeScript'));
      assert.ok(result.parsed.missing_skills.includes('GraphQL'));
      assert.ok(['Apply', 'Maybe', 'Skip'].includes(result.parsed.recommendation));
    });

    it('generates deterministic ATS optimization result', async () => {
      const prompt = `
You are an expert ATS (Applicant Tracking System). Compare this resume against this job description.
RESUME: Senior Engineer...
JOB DESCRIPTION: Cloud developer...
ats_score
`;
      const result = await mock.complete(prompt, { responseFormat: 'json' });

      assert.strictEqual(result.provider, 'mock');
      assert.ok(result.parsed);
      assert.strictEqual(typeof result.parsed.ats_score, 'number');
      assert.ok(Array.isArray(result.parsed.missing_keywords));
      assert.ok(Array.isArray(result.parsed.skills_to_improve));
    });

    it('generates deterministic salary negotiation recommendations', async () => {
      const prompt = `
You are an expert career negotiator. expected_salary
`;
      const result = await mock.complete(prompt, { responseFormat: 'json' });

      assert.strictEqual(result.provider, 'mock');
      assert.ok(result.parsed);
      assert.ok(result.parsed.expected_salary);
      assert.ok(result.parsed.market_range);
      assert.ok(Array.isArray(result.parsed.tips));
      assert.ok(typeof result.parsed.negotiation_email === 'string');
    });

    it('generates placeholder-free tailored cover letter', async () => {
      const prompt = `
Write a concise, professional cover letter for the following job.
JOB TITLE: Staff Systems Engineer
COMPANY: Acme Robotics
`;
      const result = await mock.complete(prompt);

      assert.strictEqual(result.provider, 'mock');
      assert.ok(result.content.includes('Staff Systems Engineer'));
      assert.ok(result.content.includes('Acme Robotics'));
      assert.strictEqual(result.content.includes('[Your Name]'), false);
      assert.strictEqual(result.content.includes('[Date]'), false);
    });
  });

  describe('4. AIModelManager Routing, Metrics & Fallback', () => {
    beforeEach(() => {
      aiModelManager.resetMetrics();
    });

    it('lists active providers including mock fallback', () => {
      const active = aiModelManager.getActiveProviders();
      assert.ok(active.includes('mock'), 'Mock provider must always be registered');
    });

    it('executes completion safely and tracks token metrics', async () => {
      const prompt = 'Test completion prompt for metrics';
      const result = await aiModelManager.complete(prompt, { tier: 'fast' });

      assert.ok(result.content.length > 0);
      assert.ok(result.usage.totalTokens > 0);

      const metrics = aiModelManager.getMetrics();
      assert.strictEqual(metrics.totalRequests, 1);
      assert.ok(metrics.totalTokens > 0);
      assert.ok(metrics.requestsByProvider[result.provider] >= 1);
    });

    it('executes structured completeJSON safely', async () => {
      const prompt = `
REQUIRED SKILLS: Node.js, Docker
RESUME: Expert in Node.js and cloud systems.
match_score
`;
      const result = await aiModelManager.completeJSON<any>(prompt, { tier: 'fast' });

      assert.ok(result.parsed);
      assert.strictEqual(typeof result.parsed.match_score, 'number');
    });
  });

  describe('5. AIMatchingService Integration', () => {
    it('evaluates resume match without crashing when API keys are absent', async () => {
      const match = await aiMatchingService.analyzeJobMatch(
        'Full Stack Developer with 5 years in TypeScript, React, and Node.js.',
        'Looking for a TypeScript and React engineer to build web platforms.',
        'Senior Full Stack Engineer',
        ['TypeScript', 'React', 'Docker']
      );

      assert.ok(typeof match.score === 'number');
      assert.ok(match.score >= 0 && match.score <= 100);
      assert.ok(Array.isArray(match.matchingSkills));
      assert.ok(Array.isArray(match.missingSkills));
      assert.ok(Array.isArray(match.strengths));
      assert.ok(['Apply', 'Maybe', 'Skip'].includes(match.recommendation));
    });

    it('performs ATS resume optimization without crashing', async () => {
      const optimization = await aiMatchingService.optimizeResume(
        'Software Developer with backend experience.',
        'Full Stack Cloud Developer needed.'
      );

      assert.ok(optimization);
      assert.strictEqual(typeof optimization.ats_score, 'number');
      assert.ok(Array.isArray(optimization.missing_keywords));
    });

    it('performs salary negotiation analysis without crashing', async () => {
      const negotiation = await aiMatchingService.negotiateSalary(
        'Base $120,000, 10% bonus',
        '$105,000',
        '6 years',
        'Remote',
        'Tech'
      );

      assert.ok(negotiation);
      assert.ok(negotiation.expected_salary);
      assert.ok(negotiation.market_range);
      assert.ok(Array.isArray(negotiation.tips));
    });
  });

  describe('6. CoverLetterAgent Integration', () => {
    it('generates complete cover letter without placeholders', async () => {
      const letter = await coverLetterAgent.generateCoverLetter(
        'Senior Software Engineer with 7 years of distributed systems and TypeScript experience.',
        'Lead Backend Engineer responsible for high-scale microservices.',
        'Lead Backend Engineer',
        'CloudScale Technologies'
      );

      assert.ok(typeof letter === 'string');
      assert.ok(letter.length > 50);
      assert.ok(letter.includes('Lead Backend Engineer'));
      assert.ok(letter.includes('CloudScale Technologies'));
      assert.strictEqual(letter.includes('[Your Name]'), false);
      assert.strictEqual(letter.includes('[Company]'), false);
    });
  });
});

