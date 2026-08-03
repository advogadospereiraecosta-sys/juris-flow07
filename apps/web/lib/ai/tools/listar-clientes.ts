import { z } from 'zod';
import { prisma } from '@juris-flow/db';
import type { ToolDefinition } from './registry';

const inputSchema = z.object({
  search: z.string().optional().describe('Buscar por nome/CPF/CNPJ'),
  limit: z.number().min(1).max(50).default(20).optional(),
});

type Output = {
  clients: Array<{ id: string; name: string; cpf: string | null; cnpj: string | null }>;
};

export const listarClientesTool: ToolDefinition = {
  name: 'listar_clientes',
  description:
    'Lista clientes do escritório. Use quando precisar identificar um cliente por nome ou documento, ou para confirmar que existe.',
  inputSchema,
  modelHint: 'haiku',
  handler: async (rawInput: Record<string, unknown>, ctx) => {
    const input = inputSchema.parse(rawInput as z.infer<typeof inputSchema>);
    const clients = await prisma.client.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(input.search
          ? {
              person: {
                OR: [
                  { fullName: { contains: input.search, mode: 'insensitive' } },
                  { legalName: { contains: input.search, mode: 'insensitive' } },
                  { cpf: { contains: input.search.replace(/\D/g, '') } },
                  { cnpj: { contains: input.search.replace(/\D/g, '') } },
                ],
              },
            }
          : {}),
      },
      select: {
        id: true,
        person: { select: { fullName: true, legalName: true, cpf: true, cnpj: true } },
      },
      take: input.limit ?? 20,
      orderBy: { createdAt: 'desc' },
    });

    return {
      clients: clients.map((c) => ({
        id: c.id,
        name: c.person.legalName ?? c.person.fullName ?? '—',
        cpf: c.person.cpf,
        cnpj: c.person.cnpj,
      })),
    };
  },
};
