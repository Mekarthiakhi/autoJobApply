import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { RankingAgent } from '../services/rankingAgent.js';
import { aiMatchingService, MatchResult } from '../services/aiMatchingService.js';

describe('RankingAgent', () => {
  let rankingAgent: RankingAgent;
  let originalAnalyzeJobMatch: typeof aiMatchingService.analyzeJobMatch;

  beforeEach(() => {
    rankingAgent = new RankingAgent();
    originalAnalyzeJobMatch = aiMatchingService.analyzeJobMatch;
  });

  afterEach(() => {
    aiMatchingService.analyzeJobMatch = originalAnalyzeJobMatch;
  });

  describe('scoreAndRank', () => {
    it('should generate a score, strengths, and missing skills', async () => {
      const mockResult: MatchResult = {
        score: 85,
        strengths: ['TypeScript', 'React'],
        missingSkills: ['Python'],
        matchingSkills: ['TypeScript', 'React'],
        recommendation: 'Maybe',
      };
      
      let calledWith: any[] = [];
      aiMatchingService.analyzeJobMatch = async (resumeText, jobDescription, jobTitle, requiredSkills) => {
        calledWith = [resumeText, jobDescription, jobTitle, requiredSkills];
        return mockResult;
      };

      const resumeText = 'I am a software engineer with React and TypeScript.';
      const jobDescription = 'Looking for a dev with React, TypeScript, and Python.';

      const result = await rankingAgent.scoreAndRank(resumeText, jobDescription);

      assert.ok(result);
      assert.strictEqual(result.breakdown.skillMatch, 85);
      assert.strictEqual(result.score, 52);
      assert.ok(result.strengths.includes('TypeScript'));
      assert.ok(result.missingSkills.includes('Python'));
      assert.deepStrictEqual(calledWith, [resumeText, jobDescription, 'Position', []]);
    });
  });
});
