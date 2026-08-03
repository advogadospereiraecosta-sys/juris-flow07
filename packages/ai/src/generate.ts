import type Anthropic from '@anthropic-ai/sdk';
import { getAnthropic } from './client';
import { routeModelId } from './router';
import type { PieceType } from './router';

export interface GeneratePieceOptions {
  pieceType: PieceType;
  userPlan: 'FREE' | 'ESSENTIAL' | 'PRO' | 'ELITE';
  systemPrompt: string;
  context: string; // RAG-retrieved documents
  inputs: Record<string, unknown>; // user-provided schema data
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

/**
 * Gera uma peça processual com streaming.
 *
 * Retorna um async iterable de tokens + usage final ao completar.
 *
 * ATENÇÃO: caller é responsável por:
 * 1. Verificar consentimento do usuário (LGPD)
 * 2. Limites de uso por plano
 * 3. Salvar o documento resultante
 * 4. Exibir aviso "revisão humana obrigatória"
 */
export async function* streamPiece(
  options: GeneratePieceOptions,
): AsyncGenerator<{ type: 'token'; text: string } | { type: 'usage'; usage: Anthropic.Usage }> {
  const {
    pieceType,
    userPlan,
    systemPrompt,
    context,
    inputs,
    maxTokens = 8000,
    temperature = 0.5,
    signal,
  } = options;

  const anthropic = getAnthropic();
  const model = routeModelId(pieceType, userPlan);

  const userMessage = buildUserMessage(inputs, context);

  try {
    const stream = await anthropic.messages.stream(
      {
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      },
      { signal },
    );

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield { type: 'token', text: event.delta.text };
      }
    }

    // Final message contém usage
    const finalMessage = await stream.finalMessage();
    yield { type: 'usage', usage: finalMessage.usage };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return; // Graceful abort
    }
    throw error;
  }
}

/**
 * Geração não-stream (para casos curtos como procuração).
 */
export async function generateOnce(options: {
  userPlan: 'FREE' | 'ESSENTIAL' | 'PRO' | 'ELITE';
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}): Promise<{ text: string; usage: Anthropic.Usage }> {
  const anthropic = getAnthropic();
  const model = routeModelId('CONTRATO_SOCIAL_LTDA' as PieceType, options.userPlan); // Força Sonnet como fallback

  const message = await anthropic.messages.create(
    {
      model,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.5,
      system: options.systemPrompt,
      messages: [{ role: 'user', content: options.userMessage }],
    },
    { signal: options.signal },
  );

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  return { text, usage: message.usage };
}

function buildUserMessage(inputs: Record<string, unknown>, context: string): string {
  const inputsFormatted = JSON.stringify(inputs, null, 2);
  return `# DADOS DO CASO

\`\`\`json
${inputsFormatted}
\`\`\`

# CONTEXTO JURÍDICO (RAG)

${context || '(sem contexto recuperado)'}

# INSTRUÇÕES
1. Redija a peça jurídica completa em PT-BR.
2. Use o contexto acima como fundamentação principal.
3. Estruture conforme as melhores práticas de redação jurídica.
4. Cite explicitamente cada súmula/tese/lei referenciada.
5. Não invente precedentes. Quando não houver citação específica, use "conforme jurisprudência dominante".
6. Finalize com "ROBERTO CARLOS — Advogado — OAB/XX 000.000".
`;
}
