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

export class GeminiProvider implements AIProvider {
  readonly name: ProviderName = 'gemini';

  private readonly modelMap: Record<ModelTier, string> = {
    fast: process.env.GEMINI_MODEL_FAST || 'gemini-3.5-flash-lite',
    quality: process.env.GEMINI_MODEL_QUALITY || 'gemini-3.5-flash-lite',
    reasoning: process.env.GEMINI_MODEL_REASONING || 'gemini-3.5-flash-lite',
  };

  isAvailable(): boolean {
    return Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0);
  }

  async complete(prompt: string, options: AICompletionOptions = {}): Promise<AICompletionResult> {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key is not configured');
    }

    const tier = options.tier || 'fast';
    const model = this.modelMap[tier] || this.modelMap.fast;
    const timeoutMs = options.timeoutMs ?? 20000;
    const startTime = Date.now();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const generationConfig: Record<string, any> = {
        temperature: options.temperature ?? 0.7,
      };

      if (options.maxTokens) {
        generationConfig.maxOutputTokens = options.maxTokens;
      }

      if (options.responseFormat === 'json') {
        generationConfig.responseMimeType = 'application/json';
      }

      const requestBody: Record<string, any> = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      };

      if (options.systemPrompt) {
        requestBody.system_instruction = {
          parts: [{ text: options.systemPrompt }],
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        const error: any = new Error(`Gemini API error [${response.status}]: ${response.statusText} ${errorText}`);
        error.status = response.status;
        error.isRetryable = [429, 500, 502, 503, 504].includes(response.status);
        throw error;
      }

      const data: any = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        throw new Error('Empty response from Gemini API');
      }

      const durationMs = Date.now() - startTime;
      const promptTokens = data.usageMetadata?.promptTokenCount ?? estimateTokens(prompt);
      const completionTokens = data.usageMetadata?.candidatesTokenCount ?? estimateTokens(content);
      const totalTokens = data.usageMetadata?.totalTokenCount ?? (promptTokens + completionTokens);

      let parsed: any = undefined;
      if (options.responseFormat === 'json') {
        const cleanContent = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        try {
          parsed = JSON.parse(cleanContent);
        } catch (parseErr) {
          logger.warn('Failed to parse Gemini JSON response as structured JSON', { error: parseErr });
        }
      }

      return {
        content,
        parsed,
        provider: 'gemini',
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
        const timeoutError: any = new Error(`Gemini request timed out after ${timeoutMs}ms`);
        timeoutError.isRetryable = true;
        throw timeoutError;
      }
      throw err;
    } finally {
      clearTimeout(timeoutTimer);
    }
  }
}
