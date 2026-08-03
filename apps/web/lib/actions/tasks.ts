'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma, audit } from '@juris-flow/db';

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(['TODO', 'DOING', 'BLOCKED', 'DONE', 'CANCELLED']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.string().optional(),
  reminderAt: z.string().optional(),
  caseId: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
  tags: z.array(z.string()).default([]),
});

const updateTaskSchema = createTaskSchema.partial();

async function requireSession() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Sessão inválida');
  return { userId: session.user.id, tenantId: session.user.tenantId };
}

export async function createTaskAction(
  input: z.infer<typeof createTaskSchema>,
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  try {
    const { userId, tenantId } = await requireSession();
    const parsed = createTaskSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

    const created = await prisma.task.create({
      data: {
        tenantId,
        title: parsed.data.title,
        description: parsed.data.description,
        status: parsed.data.status,
        priority: parsed.data.priority,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
        reminderAt: parsed.data.reminderAt ? new Date(parsed.data.reminderAt) : undefined,
        caseId: parsed.data.caseId ?? null,
        assignedToId: parsed.data.assignedToId ?? null,
        tags: parsed.data.tags,
        createdById: userId,
      },
    });

    await audit({
      tenantId,
      userId,
      action: 'CREATE',
      resourceType: 'task',
      resourceId: created.id,
      after: { id: created.id, title: created.title },
    });

    revalidatePath('/tarefas');
    revalidatePath('/dashboard');
    return { success: true, data: { id: created.id } };
  } catch (e) {
    console.error('[createTaskAction]', e);
    return { success: false, error: 'Erro interno ao criar tarefa' };
  }
}

export async function updateTaskAction(
  id: string,
  input: z.infer<typeof updateTaskSchema>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId } = await requireSession();
    const parsed = updateTaskSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

    const existing = await prisma.task.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) return { success: false, error: 'Tarefa não encontrada' };

    const isCompletion = parsed.data.status === 'DONE' && existing.status !== 'DONE';
    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...parsed.data,
        dueDate: parsed.data.dueDate !== undefined
          ? parsed.data.dueDate ? new Date(parsed.data.dueDate) : null
          : undefined,
        reminderAt: parsed.data.reminderAt !== undefined
          ? parsed.data.reminderAt ? new Date(parsed.data.reminderAt) : null
          : undefined,
        completedAt: isCompletion ? new Date() : undefined,
      },
    });

    await audit({ tenantId, userId, action: 'UPDATE', resourceType: 'task', resourceId: id, before: existing, after: updated });
    revalidatePath('/tarefas');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (e) {
    console.error('[updateTaskAction]', e);
    return { success: false, error: 'Erro interno ao atualizar tarefa' };
  }
}

export async function deleteTaskAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId } = await requireSession();
    await prisma.task.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
    await audit({ tenantId, userId, action: 'DELETE', resourceType: 'task', resourceId: id });
    revalidatePath('/tarefas');
    revalidatePath('/dashboard');
    return { success: true };
  } catch {
    return { success: false, error: 'Erro interno ao deletar tarefa' };
  }
}
