import { z } from 'zod';
import type { ToolDefinition } from './registry';

const inputSchema = z.object({
  query: z.string().describe('O que buscar nos documentos do caso (ex: "data do contrato", "valor do imóvel")'),
  caseId: z.string().uuid().optional().describe('ID do processo. Se omitido, busca em todos os processos do tenant.'),
  topK: z.number().min(1).max(20).default(5).optional(),
});

type Output = {
  chunks: Array<{ filename: string; content: string; similarity: number }>;
  total: number;
};

export const buscarDocumentosTool: ToolDefinition = {
  name: 'buscar_documentos',
  description:
    'Busca trechos relevantes em PDFs/DOCX/TXT anexados a processos do escritório via RAG (pgvector). Use quando o usuário quiser localizar informações em contratos, procurações, documentos pessoais, etc.',
  inputSchema,
  modelHint: 'sonnet',
  handler: async (rawInput: Record<string, unknown>, ctx) => {
    const input = inputSchema.parse(rawInput as z.infer<typeof inputSchema>);
    const { retrieveCaseContext } = await import('@/lib/ai/rag');
    let caseIds: string[] = [];
    if (input.caseId) {
      caseIds = [input.caseId];
    } else {
      const cases = await (await import('@juris-flow/db')).prisma.case.findMany({
        where: { tenantId: ctx.tenantId },
        select: { id: true },
        take: 50,
      });
      caseIds = cases.map((c) => c.id);
    }
    const all: Output['chunks'] = [];
    for (const cid of caseIds) {
      const found = await retrieveCaseContext(cid, input.query, input.topK ?? 5);
      all.push(...found);
    }
    all.sort((a, b) => b.similarity - a.similarity);
    return { chunks: all.slice(0, input.topK ?? 5), total: all.length };
  },
};
