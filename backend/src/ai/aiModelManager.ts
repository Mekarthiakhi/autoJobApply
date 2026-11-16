import { logger } from '../utils/logger.js';
import {
  AICompletionOptions,
  AICompletionResult,
  AIMetrics,
  AIProvider,
  ProviderName,
} from './types.js';
import { GeminiProvider } from './providers/geminiProvider.js';
import { OpenAIProvider } from './providers/openaiProvider.js';
import { ClaudeProvider } from './providers/claudeProvider.js';
import { MockProvider } from './providers/mockProvider.js';

export class AIModelManager {
  private providers: Map<ProviderName, AIProvider> = new Map();
  private metrics: AIMetrics = {
    totalRequests: 0,
    totalTokens: 0,
    totalCostUsd: 0,
    requestsByProvider: { gemini: 0, openai: 0, claude: 0, mock: 0 },
    errorsByProvider: { gemini: 0, openai: 0, claude: 0, mock: 0 },
  };

  constructor() {
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new ClaudeProvider());
    this.registerProvider(new MockProvider());
  }

  registerProvider(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: ProviderName): AIProvider | undefined {
    return this.providers.get(name);
  }

  getActiveProviders(): ProviderName[] {
    const active: ProviderName[] = [];
    for (const [name, provider] of this.providers.entries()) {
      if (provider.isAvailable()) {
        active.push(name);
      }
    }
    return active;
  }

  getMetrics(): AIMetrics {
    return {
      ...this.metrics,
      requestsByProvider: { ...this.metrics.requestsByProvider },
      errorsByProvider: { ...this.metrics.errorsByProvider },
    };
  }

  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      totalTokens: 0,
      totalCostUsd: 0,
      requestsByProvider: { gemini: 0, openai: 0, claude: 0, mock: 0 },
      errorsByProvider: { gemini: 0, openai: 0, claude: 0, mock: 0 },
    };
  }

  /**
   * Complete a prompt with automatic fallback across providers, retries, and token accounting.
   */
  async complete(
    prompt: string,
    options: AICompletionOptions = {}
  ): Promise<AICompletionResult> {
    const chain = this.buildProviderChain(options.preferredProvider);
    const maxRetries = options.maxRetries ?? 1;

    let lastError: Error | null = null;

    for (const providerName of chain) {
      const provider = this.providers.get(providerName);
      if (!provider || !provider.isAvailable()) continue;

      let attempt = 0;
      while (attempt <= maxRetries) {
        try {
          const result = await provider.complete(prompt, options);

          // Update metrics
          this.metrics.totalRequests += 1;
          this.metrics.totalTokens += result.usage.totalTokens;
          this.metrics.totalCostUsd = Math.round((this.metrics.totalCostUsd + result.usage.estimatedCostUsd) * 1_000_000) / 1_000_000;
          this.metrics.requestsByProvider[providerName] += 1;

          logger.info('AI completion completed', {
            provider: result.provider,
            model: result.model,
            durationMs: result.durationMs,
            totalTokens: result.usage.totalTokens,
            estimatedCostUsd: result.usage.estimatedCostUsd,
          });

          return result;
        } catch (err: any) {
          attempt += 1;
          this.metrics.errorsByProvider[providerName] += 1;
          lastError = err;

          const isRetryable = Boolean(err.isRetryable);
          if (isRetryable && attempt <= maxRetries) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            logger.warn(`AI provider ${providerName} failed with retryable error (attempt ${attempt}/${maxRetries}). Backing off ${backoffMs}ms...`, {
              error: err.message,
            });
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          } else {
            logger.warn(`AI provider ${providerName} failed, advancing to next provider in fallback chain.`, {
              error: err.message,
            });
            break; // Break retry loop to try next provider in chain
          }
        }
      }
    }

    // If all providers in chain failed, fallback to MockProvider directly
    const mock = this.providers.get('mock')!;
    logger.warn('All configured AI providers failed or were unavailable. Executing deterministic MockProvider fallback.', {
      lastError: lastError?.message,
    });
    const mockResult = await mock.complete(prompt, options);
    this.metrics.totalRequests += 1;
    this.metrics.requestsByProvider.mock += 1;
    return mockResult;
  }

  /**
   * Complete a prompt requesting structured JSON output.
   */
  async completeJSON<T = any>(
    prompt: string,
    options: AICompletionOptions = {}
  ): Promise<AICompletionResult<T>> {
    const jsonOptions: AICompletionOptions = {
      ...options,
      responseFormat: 'json',
    };

    const result = await this.complete(prompt, jsonOptions);

    if (result.parsed) {
      return result as AICompletionResult<T>;
    }

    // If parsed is not populated yet, attempt to clean and parse
    try {
      const cleanContent = result.content
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/, '')
        .trim();
      const parsed = JSON.parse(cleanContent);
      return {
        ...result,
        parsed,
      };
    } catch (err) {
      logger.error('Failed to parse AI completion output as JSON', {
        provider: result.provider,
        model: result.model,
        contentPreview: result.content.slice(0, 100),
      });
      throw new Error(`AI completion failed to produce valid JSON: ${result.content.slice(0, 100)}`);
    }
  }

  private buildProviderChain(preferred?: ProviderName): ProviderName[] {
    const chain: ProviderName[] = [];

    if (preferred && preferred !== 'mock') {
      chain.push(preferred);
    }

    const defaultOrder: ProviderName[] = ['gemini', 'openai', 'claude'];
    for (const p of defaultOrder) {
      if (!chain.includes(p)) {
        chain.push(p);
      }
    }

    chain.push('mock');
    return chain;
  }
}

export const aiModelManager = new AIModelManager();

