import Anthropic from '@anthropic-ai/sdk';
import { serverEnv } from '@juris-flow/config';

export type AnthropicModel = 'haiku' | 'sonnet' | 'opus';

/**
 * IDs oficiais dos modelos Claude suportados pela Juris-Flow.
 * Centralizado aqui para fácil troca.
 */
export const MODEL_IDS: Record<AnthropicModel, string> = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-5',
  opus: 'claude-opus-4-8',
};

/**
 * Custo por 1M tokens (USD). Fonte: Anthropic pricing público.
 */
export const MODEL_PRICING_USD_PER_MTOK: Record<
  AnthropicModel,
  { input: number; output: number }
> = {
  haiku: { input: 0.8, output: 4.0 },
  sonnet: { input: 3.0, output: 15.0 },
  opus: { input: 15.0, output: 75.0 },
};

let _client: Anthropic | null = null;

/**
 * Singleton do cliente Anthropic. Lazy para evitar inicialização em build time
 * sem ANTHROPIC_API_KEY.
 */
export function getAnthropic(): Anthropic {
  if (!_client) {
    if (!serverEnv.ANTHROPIC_API_KEY) {
      throw new Error(
        'ANTHROPIC_API_KEY não configurada. Adicione em .env (serverEnv.ANTHROPIC_API_KEY).',
      );
    }
    _client = new Anthropic({
      apiKey: serverEnv.ANTHROPIC_API_KEY,
      // Limites defensivos
      maxRetries: 3,
      timeout: 60_000,
    });
  }
  return _client;
}

/**
 * Calcula custo em centavos de uma chamada de API.
 */
export function calculateCostCents(
  model: AnthropicModel,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = MODEL_PRICING_USD_PER_MTOK[model];
  const usd = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
  const brl = usd * 5.5; // aproximação — em produção usar cotação real
  return Math.ceil(brl * 100);
}
