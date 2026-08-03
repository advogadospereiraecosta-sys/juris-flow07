import { z } from 'zod';
import { prisma, audit } from '@juris-flow/db';
import type { ToolDefinition } from './registry';

const inputSchema = z.object({
  title: z.string().min(1).describe('Título da tarefa'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.string().optional().describe('Data ISO (YYYY-MM-DD)'),
  caseId: z.string().uuid().optional(),
});

type Output = { success: boolean; taskId: string };

export const criarTarefaTool: ToolDefinition = {
  name: 'criar_tarefa',
  description:
    'Cria uma tarefa no Kanban do escritório (vinculada opcionalmente a um processo). Use para registrar pendências mencionadas durante a conversa.',
  inputSchema,
  modelHint: 'haiku',
  handler: async (rawInput: Record<string, unknown>, ctx) => {
    const input = inputSchema.parse(rawInput as z.infer<typeof inputSchema>);
    const task = await prisma.task.create({
      data: {
        tenantId: ctx.tenantId,
        createdById: ctx.userId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        caseId: input.caseId ?? null,
      },
    });
    await audit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'CREATE',
      resourceType: 'task',
      resourceId: task.id,
      after: { source: 'ai-chat', title: task.title },
    });
    return { success: true, taskId: task.id };
  },
};
