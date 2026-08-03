import { z } from 'zod';
import { prisma, audit } from '@juris-flow/db';
import { getAnthropic, MODEL_IDS } from '@juris-flow/ai';
import { getCaseContextForPrompt } from '@/lib/actions/rag';
import type { ToolDefinition } from './registry';

const inputSchema = z.object({
  caseId: z.string().uuid().optional().describe('ID do processo (recomendado para puxar contexto do Drive)'),
  autor: z.object({
    nome: z.string(),
    cpfCnpj: z.string().optional(),
    endereco: z.string().optional(),
    email: z.string().optional(),
  }).describe('Dados do autor'),
  reu: z.object({
    nome: z.string(),
    cpfCnpj: z.string().optional(),
    endereco: z.string().optional(),
  }).optional(),
  tipo: z.enum(['CONSUMIDOR', 'OBRIGACAO_FAZER', 'COBRANCA', 'INDENIZACAO', 'POSSESSORIA']).describe('Tipo da ação'),
  fatos: z.string().describe('Narrativa dos fatos em linguagem natural'),
  pedidos: z.string().optional().describe('Pedidos principais'),
  valorCausa: z.string().optional().describe('Valor da causa em reais (ex: "10000.00")'),
});

type Output = {
  pieceId: string;
  pieceUrl: string;
  status: 'COMPLETED' | 'FAILED';
  preview: string;
};

export const redigirPeticaoInicialTool: ToolDefinition = {
  name: 'redigir_peticao_inicial',
  description:
    'Redige uma petição inicial cível completa (com qualificação das partes, fatos, direito, pedidos, valor da causa). Use quando o usuário quiser iniciar um processo judicial cível. Custo maior — Opus 4.8.',
  inputSchema,
  modelHint: 'opus',
  handler: async (rawInput: Record<string, unknown>, ctx) => {
    const input = inputSchema.parse(rawInput as z.infer<typeof inputSchema>);
    const systemPrompt = `Você é advogado brasileiro redigindo petição inicial cível.
Use CPC 319 (requisitos), CPC 292 (valor da causa), CDC quando aplicável.
Sempre cite artigos. Linguagem técnica, forense, clara.`;

    // Puxa contexto RAG do caso, se houver
    let ragContext = '';
    if (input.caseId) {
      ragContext = await getCaseContextForPrompt(
        input.caseId,
        `petição inicial ${input.fatos}`,
        5,
      );
    }

    const userPrompt = `# DADOS PARA A PETIÇÃO INICIAL

**Tipo:** ${input.tipo}

**AUTOR**
Nome: ${input.autor.nome}
${input.autor.cpfCnpj ? `CPF/CNPJ: ${input.autor.cpfCnpj}` : ''}
${input.autor.endereco ? `Endereço: ${input.autor.endereco}` : ''}
${input.autor.email ? `Email: ${input.autor.email}` : ''}

${input.reu ? `**RÉU**
Nome: ${input.reu.nome}
${input.reu.cpfCnpj ? `CPF/CNPJ: ${input.reu.cpfCnpj}` : ''}
${input.reu.endereco ? `Endereço: ${input.reu.endereco}` : ''}
` : ''}

**FATOS**
${input.fatos}

**PEDIDOS**
${input.pedidos ?? 'A definir.'}

**VALOR DA CAUSA**
${input.valorCausa ?? 'R$ 10.000,00 (estimar se necessário)'}

${ragContext ? `# DOCUMENTOS DO PROCESSO (Drive)\n\n${ragContext}` : ''}

# INSTRUÇÕES
Redija a petição inicial completa no formato padrão forense brasileiro:
1. Endereçamento ao juízo competente
2. Qualificação completa das partes
3. DOS FATOS (narrativa detalhada com referências aos documentos anexos)
4. DO DIREITO (fundamentação legal com citação de artigos)
5. DOS PEDIDOS (lista numerada)
6. VALOR DA CAUSA
7. Fecho (termos em que pede deferimento, data, assinatura, OAB)

Use markdown.`;

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
        type: 'PETICAO_INICIAL_CIVEL',
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
      after: { source: 'ai-chat-tool', type: 'PETICAO_INICIAL_CIVEL' },
    });

    return {
      pieceId: piece.id,
      pieceUrl: `/pecas/${piece.id}`,
      status: 'COMPLETED',
      preview: text.slice(0, 300),
    };
  },
};
