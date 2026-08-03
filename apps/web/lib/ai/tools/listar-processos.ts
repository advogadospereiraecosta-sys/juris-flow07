import { z } from 'zod';
import { prisma } from '@juris-flow/db';
import type { ToolDefinition } from './registry';

const inputSchema = z.object({
  search: z.string().optional().describe('Buscar por título, CNJ ou parte contrária'),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'JUDGED', 'ARCHIVED', 'SETTLED', 'EXECUTED', 'APPEALED']).optional(),
  limit: z.number().min(1).max(50).default(20).optional(),
});

type Output = {
  cases: Array<{
    id: string;
    title: string;
    cnjNumber: string | null;
    status: string;
    clientId: string | null;
    opposingPartyName: string | null;
  }>;
};

export const listarProcessosTool: ToolDefinition = {
  name: 'listar_processos',
  description:
    'Lista processos do escritório. Use quando precisar identificar um processo por título, CNJ, parte contrária ou status.',
  inputSchema,
  modelHint: 'haiku',
  handler: async (rawInput: Record<string, unknown>, ctx) => {
    const input = inputSchema.parse(rawInput as z.infer<typeof inputSchema>);
    const cases = await prisma.case.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(input.status ? { status: input.status } : {}),
        ...(input.search
          ? {
              OR: [
                { title: { contains: input.search, mode: 'insensitive' } },
                { cnjNumber: { contains: input.search.replace(/\D/g, '') } },
                { opposingPartyName: { contains: input.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        title: true,
        cnjNumber: true,
        status: true,
        clientId: true,
        opposingPartyName: true,
      },
      take: input.limit ?? 20,
      orderBy: { updatedAt: 'desc' },
    });

    return { cases: cases.map((c) => ({ ...c, status: String(c.status) })) };
  },
};
