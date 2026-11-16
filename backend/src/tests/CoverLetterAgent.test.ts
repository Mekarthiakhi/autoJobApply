import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { CoverLetterAgent } from '../services/coverLetterAgent.js';
import { aiModelManager } from '../ai/index.js';

describe('CoverLetterAgent', () => {
  let coverLetterAgent: CoverLetterAgent;
  let originalComplete: typeof aiModelManager.complete;

  beforeEach(() => {
    coverLetterAgent = new CoverLetterAgent();
    originalComplete = aiModelManager.complete;
  });

  afterEach(() => {
    aiModelManager.complete = originalComplete;
  });

  describe('generateCoverLetter', () => {
    it('should generate a cover letter given a resume and job description', async () => {
      const mockResult = 'Dear Hiring Manager, I am writing to apply for the Frontend Developer position...';
      let capturedPrompt = '';
      
      aiModelManager.complete = (async (prompt: string): Promise<any> => {
        capturedPrompt = prompt;
        return {
          content: mockResult,
          provider: 'mock',
          model: 'mock-deterministic',
          durationMs: 1,
          totalTokens: 50,
          estimatedCostUsd: 0,
          usage: { promptTokens: 30, completionTokens: 20, totalTokens: 50 },
        };
      }) as any;

      const resumeText = 'Software engineer with 5 years experience.';
      const jobDescription = 'Looking for a Senior Frontend Developer.';

      const result = await coverLetterAgent.generateCoverLetter(resumeText, jobDescription);

      assert.strictEqual(result, mockResult);
      assert.ok(capturedPrompt.includes(resumeText));
      assert.ok(capturedPrompt.includes(jobDescription));
    });
  });
});
