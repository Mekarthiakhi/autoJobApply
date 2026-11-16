import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import {
  AICompletionOptions,
  AICompletionResult,
  AIProvider,
  ModelTier,
  ProviderName,
} from '../types.js';
import { calculateCost, estimateTokens } from '../costCalculator.js';

export class ClaudeProvider implements AIProvider {
  readonly name: ProviderName = 'claude';

  private readonly modelMap: Record<ModelTier, string> = {
    fast: process.env.CLAUDE_MODEL_FAST || 'claude-3-5-haiku-20241022',
    quality: process.env.CLAUDE_MODEL_QUALITY || 'claude-3-5-sonnet-20241022',
    reasoning: process.env.CLAUDE_MODEL_REASONING || 'claude-3-5-sonnet-20241022',
  };

  isAvailable(): boolean {
    return Boolean(env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.trim().length > 0);
  }

  async complete(prompt: string, options: AICompletionOptions = {}): Promise<AICompletionResult> {
    if (!this.isAvailable()) {
      throw new Error('Anthropic API key is not configured');
    }

    const tier = options.tier || 'fast';
    const model = this.modelMap[tier] || this.modelMap.fast;
    const timeoutMs = options.timeoutMs ?? 20000;
    const startTime = Date.now();

    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const requestBody: Record<string, any> = {
        model,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.7,
        messages: [{ role: 'user', content: prompt }],
      };

      if (options.systemPrompt) {
        requestBody.system = options.systemPrompt;
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        const error: any = new Error(`Anthropic API error [${response.status}]: ${response.statusText} ${errorText}`);
        error.status = response.status;
        error.isRetryable = [429, 500, 502, 503, 529].includes(response.status);
        throw error;
      }

      const data: any = await response.json();
      const content = data.content?.[0]?.text;

      if (!content) {
        throw new Error('Empty response from Anthropic API');
      }

      const durationMs = Date.now() - startTime;
      const promptTokens = data.usage?.input_tokens ?? estimateTokens(prompt);
      const completionTokens = data.usage?.output_tokens ?? estimateTokens(content);
      const totalTokens = promptTokens + completionTokens;

      let parsed: any = undefined;
      if (options.responseFormat === 'json') {
        const cleanContent = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        try {
          parsed = JSON.parse(cleanContent);
        } catch (parseErr) {
          logger.warn('Failed to parse Claude JSON response as structured JSON', { error: parseErr });
        }
      }

      return {
        content,
        parsed,
        provider: 'claude',
        model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCostUsd: calculateCost(model, promptTokens, completionTokens),
        },
        durationMs,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const timeoutError: any = new Error(`Claude request timed out after ${timeoutMs}ms`);
        timeoutError.isRetryable = true;
        throw timeoutError;
      }
      throw err;
    } finally {
      clearTimeout(timeoutTimer);
    }
  }
}
