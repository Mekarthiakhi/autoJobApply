interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

const PRICING_TABLE: Record<string, ModelPricing> = {
  // Google Gemini
  'gemini-1.5-flash': { inputPerMillion: 0.075, outputPerMillion: 0.30 },
  'gemini-1.5-pro': { inputPerMillion: 1.25, outputPerMillion: 5.00 },
  'gemini-2.0-flash': { inputPerMillion: 0.10, outputPerMillion: 0.40 },
  'gemini-default': { inputPerMillion: 0.10, outputPerMillion: 0.40 },

  // OpenAI
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.60 },
  'gpt-4o': { inputPerMillion: 2.50, outputPerMillion: 10.00 },
  'gpt-3.5-turbo': { inputPerMillion: 0.50, outputPerMillion: 1.50 },
  'openai-default': { inputPerMillion: 0.15, outputPerMillion: 0.60 },

  // Anthropic Claude
  'claude-3-5-haiku-20241022': { inputPerMillion: 0.80, outputPerMillion: 4.00 },
  'claude-3-5-sonnet-20241022': { inputPerMillion: 3.00, outputPerMillion: 15.00 },
  'claude-default': { inputPerMillion: 1.00, outputPerMillion: 5.00 },

  // Mock / deterministic
  'mock-deterministic': { inputPerMillion: 0, outputPerMillion: 0 },
};

/**
 * Calculate the estimated cost in USD for a given model and token usage.
 */
export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const normalizedModel = model.toLowerCase().trim();
  let pricing = PRICING_TABLE[normalizedModel];

  if (!pricing) {
    if (normalizedModel.includes('gemini')) {
      pricing = PRICING_TABLE['gemini-default'];
    } else if (normalizedModel.includes('gpt') || normalizedModel.includes('openai')) {
      pricing = PRICING_TABLE['openai-default'];
    } else if (normalizedModel.includes('claude') || normalizedModel.includes('anthropic')) {
      pricing = PRICING_TABLE['claude-default'];
    } else {
      pricing = { inputPerMillion: 0, outputPerMillion: 0 };
    }
  }

  const inputCost = (promptTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPerMillion;
  const total = inputCost + outputCost;

  // Round to 6 decimal places
  return Math.round(total * 1_000_000) / 1_000_000;
}

/**
 * Rough token estimation when exact provider usage is not available (~4 characters per token).
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

