import { z } from 'zod';
import { prisma, audit } from '@juris-flow/db';
import { getAnthropic, MODEL_IDS } from '@juris-flow/ai';
import { getCaseContextForPrompt } from '@/lib/actions/rag';
import type { ToolDefinition } from './registry';

const inputSchema = z.object({
  caseId: z.string().uuid().optional(),
  resumoInicial: z.string().describe('Resumo da petição inicial que está sendo contestada'),
  preliminares: z.array(z.string()).optional().describe('Preliminares do CPC 337 (ex: inépcia, ilegitimidade, inépcia)'),
  fatos_reu: z.string().describe('Versão dos fatos sob a ótica do réu'),
  defesa: z.string().describe('Argumentos de defesa (mérito)'),
  pedidos: z.string().optional(),
});

type Output = { pieceId: string; pieceUrl: string; status: 'COMPLETED'; preview: string };

export const redigirContestacaoTool: ToolDefinition = {
  name: 'redigir_contestacao',
  description:
    'Redige contestação cível completa (CPC 335-343) com preliminares, impugnação específica dos fatos e mérito. Custo maior — Opus 4.8.',
  inputSchema,
  modelHint: 'opus',
  handler: async (rawInput, ctx) => {
    const input = inputSchema.parse(rawInput);
    let ragContext = '';
    if (input.caseId) {
      ragContext = await getCaseContextForPrompt(input.caseId, `contestação ${input.resumoInicial}`, 5);
    }

    const systemPrompt = `Você é advogado brasileiro redigindo contestação cível.
Use CPC 335 (prazo), CPC 337 (preliminares), CPC 341 (impugnação ESPECÍFICA), CPC 342 (ônus da prova).
Não deixe nenhum fato da inicial sem resposta. Linguagem forense.`;

    const userPrompt = `# DADOS PARA A CONTESTAÇÃO

**PETIÇÃO INICIAL (resumo)**
${input.resumoInicial}

${input.preliminares?.length ? `**PRELIMINARES (CPC 337)**
${input.preliminares.map((p, i) => `${i + 1}. ${p}`).join('\n')}` : ''}

**VERSÃO DOS FATOS (réu)**
${input.fatos_reu}

**DEFESA (mérito)**
${input.defesa}

${input.pedidos ? `**PEDIDOS**\n${input.pedidos}` : ''}

${ragContext ? `# DOCUMENTOS DO PROCESSO\n${ragContext}` : ''}

# ESTRUTURA
1. Endereçamento
2. PRELIMINARES (se houver)
3. IMPUGNAÇÃO ESPECÍFICA DOS FATOS — fato a fato, negando ou admitindo com ressalvas (CPC 341)
4. DO MÉRITO — argumentação detalhada
5. DOS PEDIDOS — improcedência, condenação em honorários, inversão de ônus da prova se aplicável
6. Fecho

Use markdown. Cite artigos de lei (CC, CDC, CPC).`;

    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: MODEL_IDS.opus,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = message.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const piece = await prisma.pieceGeneration.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        type: 'CONTESTACAO_CIVEL',
        model: 'CLAUDE_OPUS_4_8',
        temperature: 0.3,
        input: input as object,
        caseId: input.caseId ?? null,
        status: 'COMPLETED',
        outputText: text,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        costCents: 0,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    await audit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'CREATE',
      resourceType: 'piece_generation',
      resourceId: piece.id,
      after: { source: 'ai-chat-tool', type: 'CONTESTACAO_CIVEL' },
    });

    return {
      pieceId: piece.id,
      pieceUrl: `/pecas/${piece.id}`,
      status: 'COMPLETED',
      preview: text.slice(0, 300),
    };
  },
};
