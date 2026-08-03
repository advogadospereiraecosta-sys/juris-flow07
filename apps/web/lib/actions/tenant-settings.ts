'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';

const settingsSchema = z.object({
  autoAssignToResponsible: z.boolean(),
  notifyOnNewPublication: z.boolean(),
  emailDigestFrequency: z.enum(['NEVER', 'DAILY', 'WEEKLY']),
});

export async function toggleRuleAction(input: z.infer<typeof settingsSchema>) {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return { success: false, error: 'Não autenticado' };

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Dados inválidos' };

  await prisma.tenantSetting.upsert({
    where: { tenantId },
    create: { tenantId, ...parsed.data },
    update: parsed.data,
  });

  revalidatePath('/inbox');
  return { success: true };
}
