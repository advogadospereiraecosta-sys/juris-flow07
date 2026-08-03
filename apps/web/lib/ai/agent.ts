/**
 * Loop agentic: Claude recebe mensagem + tools, decide se chama alguma,
 * executamos, devolvemos o resultado, Claude continua até responder em texto puro.
 */

import Anthropic from '@anthropic-ai/sdk';
import { tools, describeToolForClaude, getToolByName, type ToolContext, type ModelHint } from './tools/registry';
import { prisma } from '@juris-flow/db';

const SYSTEM_PROMPT = `Você é o Juris-Flow Assistant, um assistente jurídico brasileiro que ajuda advogados em sua rotina no escritório.

Você tem acesso a ferramentas (tools) que executam ações reais no sistema:
- buscar_documentos: busca em PDFs/DOCX do Drive via RAG
- listar_clientes / listar_processos: localizar cadastros
- criar_tarefa: registrar pendências
- redigir_peticao_inicial / redigir_contestacao: redigir peças (Opus 4.8)
- calcular_prazo_fatal: datas fatais + régua de lembretes
- pesquisar_jurisprudencia / pesquisar_lei_sumula: pesquisa jurídica
- orientar_cliente: orientação preliminar em linguagem acessível

Use as tools SEMPRE que precisar de informação ou executar uma ação.
NÃO invente dados que você pode buscar. Se faltar informação, PERGUNTE ao advogado.

Responda de forma concisa e técnica. Use markdown para estruturar. Em peças longas, use títulos e listas.

Lembre-se:
- Saídas de tools de peça (redigir_peticao_inicial, redigir_contestacao) geram URLs para revisão
- Peças devem ser revisadas pelo advogado antes de protocolo (OAB)
- Prazo fatal é responsabilidade do escritório; sempre confirme a data calculada`;

export interface AgenticRunInput {
  threadId: string;
  tenantId: string;
  userId: string;
  caseId?: string | null;
  userMessage: string;
  onEvent: (event: AgenticEvent) => void;
}

export type AgenticEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call_start'; name: string; input: unknown }
  | { type: 'tool_call_end'; name: string; output: unknown }
  | { type: 'tool_call_error'; name: string; error: string }
  | { type: 'done'; messageId: string; costCents: number };

const MAX_TOOL_ITERATIONS = 6;

export async function runAgenticChat(input: AgenticRunInput): Promise<void> {
  const { threadId, tenantId, userId, caseId, userMessage, onEvent } = input;

  const ctx: ToolContext = { tenantId, userId, threadId, caseId };

  // Persiste mensagem do usuário
  const userMsg = await prisma.aiMessage.create({
    data: { threadId, role: 'user', content: userMessage },
  });

  // Carrega histórico (últimas 20 mensagens)
  const history = await prisma.aiMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  // Monta histórico pro Claude
  const messages = history
    .filter((m) => m.id !== userMsg.id)
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
    .concat({ role: 'user' as const, content: userMessage });

  const client = new Anthropic();
  const claudeTools = tools.map(describeToolForClaude);

  let totalCost = 0;
  let totalInput = 0;
  let totalOutput = 0;
  let finalText = '';

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      tools: claudeTools as Parameters<typeof client.messages.stream>[0]['tools'],
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    // Coleta eventos do stream
    const toolUses: Array<{ id: string; name: string; input: unknown }> = [];
    let textThisIter = '';

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'tool_use') {
          toolUses.push({
            id: event.content_block.id,
            name: event.content_block.name,
            input: event.content_block.input,
          });
        }
      }
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          textThisIter += event.delta.text;
          onEvent({ type: 'text_delta', text: event.delta.text });
        }
      }
    }

    finalText += textThisIter;
    const finalMessage = await stream.finalMessage();
    totalInput += finalMessage.usage.input_tokens;
    totalOutput += finalMessage.usage.output_tokens;

    // Se não houve tool use, fim do loop
    if (toolUses.length === 0) {
      break;
    }

    // Adiciona a resposta do assistant ao histórico
    messages.push({
      role: 'assistant',
      content: finalMessage.content as unknown as string,
    });

    // Executa cada tool
    const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];
    for (const toolUse of toolUses) {
      const toolDef = getToolByName(toolUse.name);
      if (!toolDef) {
        onEvent({ type: 'tool_call_error', name: toolUse.name, error: 'Tool não encontrada' });
        continue;
      }

      onEvent({ type: 'tool_call_start', name: toolUse.name, input: toolUse.input });

      try {
        const parsed = toolDef.inputSchema.safeParse(toolUse.input);
        if (!parsed.success) {
          onEvent({
            type: 'tool_call_error',
            name: toolUse.name,
            error: parsed.error.errors[0]?.message ?? 'Input inválido',
          });
          continue;
        }

        const output = await toolDef.handler(parsed.data, ctx);
        onEvent({ type: 'tool_call_end', name: toolUse.name, output });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(output),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro interno';
        onEvent({ type: 'tool_call_error', name: toolUse.name, error: msg });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify({ error: msg }),
        });
      }
    }

    messages.push({
      role: 'user',
      content: JSON.stringify(toolResults),
    });
  }

  // Persiste mensagem do assistant
  const assistantMsg = await prisma.aiMessage.create({
    data: {
      threadId,
      role: 'assistant',
      content: finalText || '(resposta vazia)',
      model: 'claude-sonnet-4-5',
      inputTokens: totalInput,
      outputTokens: totalOutput,
      costCents: totalCost,
    },
  });

  // Auto-título da thread
  if (finalText && history.length <= 1) {
    const title = userMessage.slice(0, 60).replace(/\n/g, ' ');
    await prisma.aiThread.update({
      where: { id: threadId },
      data: { title, caseId: caseId ?? undefined },
    });
  }

  onEvent({ type: 'done', messageId: assistantMsg.id, costCents: totalCost });
}
