'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma, audit, MonitorKind } from '@juris-flow/db';

const createSchema = z.object({
  kind: z.enum(['OAB', 'CNPJ', 'PARTY_NAME']),
  value: z.string().min(2).max(100),
  court: z.string().max(20).optional(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  active: z.boolean(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

const PLAN_LIMIT: Record<string, number> = {
  FREE: 1,
  PRO: 10,
  ELITE: 50,
};

export async function criarMonitorAction(input: z.infer<typeof createSchema>): Promise<{
  success: boolean;
  monitorId?: string;
  error?: string;
}> {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  const userId = session?.user?.id;
  if (!tenantId || !userId) return { success: false, error: 'Não autenticado' };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });
  const limit = PLAN_LIMIT[tenant?.plan ?? 'FREE'] ?? 1;
  const currentCount = await prisma.monitor.count({
    where: { tenantId, active: true },
  });

  if (currentCount >= limit) {
    return {
      success: false,
      error: `Limite de ${limit} monitoramento${limit > 1 ? 's' : ''} atingido no plano ${tenant?.plan ?? 'FREE'}. Faça upgrade ou desative um termo existente.`,
    };
  }

  try {
    const monitor = await prisma.monitor.create({
      data: {
        tenantId,
        userId,
        kind: parsed.data.kind as MonitorKind,
        value: parsed.data.value,
        court: parsed.data.court?.toUpperCase() ?? null,
      },
    });

    await audit({
      tenantId,
      userId,
      action: 'CREATE',
      resourceType: 'monitor',
      resourceId: monitor.id,
      after: { kind: parsed.data.kind, value: parsed.data.value },
    });

    revalidatePath('/inbox');
    return { success: true, monitorId: monitor.id };
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return { success: false, error: 'Esse termo já está sendo monitorado.' };
    }
    return { success: false, error: 'Erro ao criar' };
  }
}

export async function toggleMonitorAction(input: z.infer<typeof updateSchema>): Promise<{ success: boolean }> {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return { success: false };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { success: false };

  await prisma.monitor.update({
    where: { id: parsed.data.id, tenantId },
    data: { active: parsed.data.active },
  });

  revalidatePath('/inbox');
  return { success: true };
}

export async function deletarMonitorAction(input: z.infer<typeof deleteSchema>): Promise<{ success: boolean }> {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return { success: false };

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { success: false };

  await prisma.monitor.delete({
    where: { id: parsed.data.id, tenantId },
  });

  revalidatePath('/inbox');
  return { success: true };
}

export async function listarMonitoresAction(activeOnly = true) {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return [];

  return prisma.monitor.findMany({
    where: { tenantId, ...(activeOnly ? { active: true } : {}) },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      kind: true,
      value: true,
      court: true,
      active: true,
      createdAt: true,
    },
  });
}
