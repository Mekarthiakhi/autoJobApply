import { OpenAI } from 'openai';
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

export class OpenAIProvider implements AIProvider {
  readonly name: ProviderName = 'openai';

  private readonly modelMap: Record<ModelTier, string> = {
    fast: process.env.OPENAI_MODEL_FAST || 'gpt-4o-mini',
    quality: process.env.OPENAI_MODEL_QUALITY || 'gpt-4o',
    reasoning: process.env.OPENAI_MODEL_REASONING || 'gpt-4o',
  };

  private client: OpenAI | null = null;

  isAvailable(): boolean {
    return Boolean(env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim().length > 0);
  }

  private getClient(timeoutMs: number): OpenAI {
    return new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      timeout: timeoutMs,
    });
  }

  async complete(prompt: string, options: AICompletionOptions = {}): Promise<AICompletionResult> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key is not configured');
    }

    const tier = options.tier || 'fast';
    const model = this.modelMap[tier] || this.modelMap.fast;
    const timeoutMs = options.timeoutMs ?? 20000;
    const startTime = Date.now();

    const client = this.getClient(timeoutMs);

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    try {
      const completionParams: any = {
        model,
        messages,
        temperature: options.temperature ?? 0.7,
      };

      if (options.maxTokens) {
        completionParams.max_tokens = options.maxTokens;
      }

      if (options.responseFormat === 'json') {
        completionParams.response_format = { type: 'json_object' };
      }

      const response = await client.chat.completions.create(completionParams);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI API');
      }

      const durationMs = Date.now() - startTime;
      const promptTokens = response.usage?.prompt_tokens ?? estimateTokens(prompt);
      const completionTokens = response.usage?.completion_tokens ?? estimateTokens(content);
      const totalTokens = response.usage?.total_tokens ?? (promptTokens + completionTokens);

      let parsed: any = undefined;
      if (options.responseFormat === 'json') {
        const cleanContent = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        try {
          parsed = JSON.parse(cleanContent);
        } catch (parseErr) {
          logger.warn('Failed to parse OpenAI JSON response as structured JSON', { error: parseErr });
        }
      }

      return {
        content,
        parsed,
        provider: 'openai',
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
      const status = err.status || err.statusCode;
      if (status && [429, 500, 502, 503, 504].includes(status)) {
        err.isRetryable = true;
      }
      throw err;
    }
  }
}
