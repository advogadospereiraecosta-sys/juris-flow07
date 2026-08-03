import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma, audit } from '@juris-flow/db';
import { getAnthropic, calculateCostCents, MODEL_IDS } from '@juris-flow/ai';
import {
  getTemplate,
  renderUserPrompt,
  validateInputs,
} from '@/lib/ai/pieces-templates';
import type { AnthropicModel } from '@juris-flow/ai';
import { getCaseContextForPrompt } from '@/lib/actions/rag';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toAnthropicModel(m: 'CLAUDE_OPUS_4_8' | 'CLAUDE_SONNET_5' | 'CLAUDE_HAIKU_4_5'): AnthropicModel {
  return ({ CLAUDE_OPUS_4_8: 'opus', CLAUDE_SONNET_5: 'sonnet', CLAUDE_HAIKU_4_5: 'haiku' } as const)[m];
}

function sse(text: string, event = 'message') {
  // Envia o payload puro (sem envelopar em {text}).
  // O cliente concatena os deltas conforme eles chegam.
  return `event: ${event}\ndata: ${JSON.stringify(text)}\n\n`;
}

/**
 * GET /api/pieces/[id]/stream
 *
 * Abre um EventSource (SSE). Se a geração ainda não começou, inicia-a.
 * Stream: evento "text" → fragmentos do texto
 *         evento "done" → tokens + custo
 *         evento "error" → mensagem de erro
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const userId = session.user.id;
  const tenantId = session.user.tenantId;

  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  // Verifica se a geração existe e é nossa
  const generation = await prisma.pieceGeneration.findFirst({
    where: { id: params.id, tenantId, deletedAt: null },
  });

  if (!generation) {
    return NextResponse.json({ error: 'Peça não encontrada' }, { status: 404 });
  }

  // Se já terminou, retorna o texto completo como evento "text" e fecha
  if (generation.status === 'COMPLETED') {
    const stream = new ReadableStream({
      start(controller) {
        if (generation.outputText) {
          controller.enqueue(sse(generation.outputText, 'text'));
        }
        controller.enqueue(
          `event: done\ndata: ${JSON.stringify({
            inputTokens: generation.inputTokens,
            outputTokens: generation.outputTokens,
            costCents: generation.costCents,
          })}\n\n`,
        );
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  if (generation.status === 'FAILED') {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(sse(generation.errorMessage ?? 'Erro desconhecido', 'error'));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  // GENERATING — conecta no stream em tempo real
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Reconstrói o spec do template
        let spec;
        if (generation.templateId) {
          const tpl = await prisma.pieceTemplate.findFirst({
            where: { id: generation.templateId, tenantId },
          });
          if (!tpl) throw new Error('Template não encontrado');
          spec = {
            systemPrompt: tpl.systemPrompt,
            userPromptTemplate: tpl.userPromptTemplate,
            requiredFields: (tpl.requiredFields ?? []) as never,
            optionalFields: (tpl.optionalFields ?? []) as never,
          };
        } else {
          const found = getTemplate(generation.type);
          if (!found) throw new Error(`Template para ${generation.type} não disponível`);
          spec = found;
        }

        const inputs = (generation.input ?? {}) as Record<string, unknown>;
        const validated = validateInputs(spec as Parameters<typeof validateInputs>[0], inputs);
        if (!validated.ok) throw new Error(`Inputs inválidos: ${validated.missing.join(', ')}`);

        const anthropicModel = toAnthropicModel(generation.model);
        const modelId = MODEL_IDS[anthropicModel];
        const userPrompt = renderUserPrompt(spec.userPromptTemplate, inputs);

        const optionalBlock = spec.optionalFields
          .map((f) => {
            const val = inputs[f.key];
            if (val == null || val === '') return null;
            return `- **${f.label}:** ${val}`;
          })
          .filter(Boolean)
          .join('\n');

        // RAG: busca contexto relevante nos documentos do Drive do caso
        let ragContext = '';
        if (generation.caseId) {
          try {
            const queryForRag = Object.entries(inputs)
              .map(([k, v]) => `${k}: ${v}`)
              .join('\n');
            ragContext = await getCaseContextForPrompt(generation.caseId, queryForRag, 5);
          } catch (e) {
            console.error('[rag] retrieval failed (continuing without):', e);
          }
        }

        const ragBlock = ragContext
          ? `\n\n# DOCUMENTOS DO PROCESSO (Drive)\n\nOs trechos abaixo foram extraídos automaticamente de documentos anexados ao processo. Use-os como fonte primária de fatos. CITE o nome do arquivo entre colchetes quando usar.\n\n${ragContext}`
          : '';

        const fullUserPrompt = `${userPrompt}\n\n# DADOS COMPLETOS FORNECIDOS\n\n${Object.entries(inputs)
          .map(([k, v]) => `- **${k}:** ${v}`)
          .join('\n')}\n\n# CAMPOS OPCIONAIS PREENCHIDOS\n${optionalBlock || '(nenhum)'}${ragBlock}`;

        const anthropic = getAnthropic();

        // --- Streaming ---
        let fullText = '';
        let inputTokens = 0;
        let outputTokens = 0;

        const messageStream = anthropic.messages.stream({
          model: modelId,
          max_tokens: 8000,
          system: spec.systemPrompt,
          messages: [{ role: 'user', content: fullUserPrompt }],
        });

        for await (const event of messageStream) {
          if (event.type === 'message_start') {
            inputTokens = (event.message as { usage?: { input_tokens: number } })?.usage?.input_tokens ?? 0;
          }
          if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              fullText += event.delta.text;
              controller.enqueue(sse(event.delta.text, 'text'));
            }
          }
          if (event.type === 'message_delta') {
            outputTokens = event.usage.output_tokens;
          }
          if (event.type === 'message_stop') {
            // input_tokens disponíveis via usage no message_delta anterior
          }
        }

        const costCents = calculateCostCents(anthropicModel, inputTokens, outputTokens);

        // Persiste resultado
        await prisma.pieceGeneration.update({
          where: { id: generation.id },
          data: {
            outputText: fullText,
            status: 'COMPLETED',
            inputTokens,
            outputTokens,
            costCents,
            completedAt: new Date(),
            refinements: [{ at: new Date().toISOString(), text: fullText, note: 'generated_stream' }],
          },
        });

        // Atualiza uso IA do tenant
        await prisma.usageRecord.upsert({
          where: {
            tenantId_metric_period: {
              tenantId,
              metric: 'ia_pieces',
              period: new Date(new Date().toISOString().slice(0, 10)),
            },
          },
          create: { tenantId, metric: 'ia_pieces', period: new Date(new Date().toISOString().slice(0, 10)), value: BigInt(1) },
          update: { value: { increment: BigInt(1) } },
        });

        await audit({
          tenantId,
          userId,
          action: 'CREATE',
          resourceType: 'piece_generation',
          resourceId: generation.id,
          after: { type: generation.type, model: generation.model, streaming: true },
        });

        // Envia done com metadados — payload é JSON estruturado
        controller.enqueue(
          `event: done\ndata: ${JSON.stringify({ inputTokens, outputTokens, costCents })}\n\n`,
        );
        controller.close();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro interno';
        console.error('[stream]', msg);
        await prisma.pieceGeneration.update({
          where: { id: generation.id },
          data: { status: 'FAILED', errorMessage: msg, completedAt: new Date() },
        });
        controller.enqueue(sse(msg, 'error'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // nginx
    },
  });
}
