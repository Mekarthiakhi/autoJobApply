export type ModelTier = 'fast' | 'quality' | 'reasoning';
export type ProviderName = 'gemini' | 'openai' | 'claude' | 'mock';

export interface AICompletionOptions {
  tier?: ModelTier;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
  systemPrompt?: string;
  responseFormat?: 'text' | 'json';
  preferredProvider?: ProviderName;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface AICompletionResult<T = any> {
  content: string;
  parsed?: T;
  provider: ProviderName;
  model: string;
  usage: TokenUsage;
  durationMs: number;
}

export interface AIProvider {
  readonly name: ProviderName;
  isAvailable(): boolean;
  complete(prompt: string, options?: AICompletionOptions): Promise<AICompletionResult>;
}

export interface AIMetrics {
  totalRequests: number;
  totalTokens: number;
  totalCostUsd: number;
  requestsByProvider: Record<ProviderName, number>;
  errorsByProvider: Record<ProviderName, number>;
}

