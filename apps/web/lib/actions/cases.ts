'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma, audit } from '@juris-flow/db';

// === Schemas ===

const caseBaseSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  cnjNumber: z.string().optional(),
  court: z.string().max(50).optional(),
  courtUnit: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  state: z.string().length(2).optional(),
  legalArea: z.string(),
  subArea: z.string().max(100).optional(),
  procedureType: z.string().optional(),
  status: z.string().default('ACTIVE'),
  phase: z.string().default('INTAKE'),
  clientId: z.string().uuid().optional(),
  clientPartyRole: z.enum(['AUTOR', 'REU', 'LITISCONSORTE', 'ASSISTENTE', 'TERCEIRO', 'OPOENTE']).optional(),
  opposingPartyName: z.string().max(200).optional(),
  opposingPartyCpf: z.string().optional(),
  opposingPartyCnpj: z.string().optional(),
  opposingLawyerName: z.string().max(200).optional(),
  opposingLawyerOab: z.string().optional(),
  caseValueCents: z.number().int().nonnegative().optional(),
  filingDate: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

const createCaseSchema = caseBaseSchema;
const updateCaseSchema = caseBaseSchema.partial();

const movementSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  occurredAt: z.string(),
  code: z.string().optional(),
  isFatal: z.boolean().default(false),
  deadlineDays: z.number().int().nonnegative().optional(),
  deadlineKind: z.enum(['UTEIS', 'CORRIDOS']).optional(),
  attachments: z.any().optional(),
});

// === Helpers ===

async function requireSession() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Sessão inválida');
  return { userId: session.user.id, tenantId: session.user.tenantId };
}

// === Case Actions ===

export async function createCaseAction(
  input: z.infer<typeof createCaseSchema>,
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  try {
    const { userId, tenantId } = await requireSession();
    const parsed = createCaseSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

    console.log('[createCaseAction] input.clientId:', input.clientId, 'tenantId:', tenantId);

    const data = parsed.data;
    const filingDate = data.filingDate ? new Date(data.filingDate) : undefined;

    const created = await prisma.case.create({
      data: {
        tenantId,
        ...data,
        filingDate,
        caseValueCents: data.caseValueCents != null ? BigInt(data.caseValueCents) : undefined,
        responsibleUserId: userId,
        searchText: `${data.title} ${data.court ?? ''} ${data.district ?? ''}`.toLowerCase(),
      } as Parameters<typeof prisma.case.create>[0]['data'],
    });

    await audit({
      tenantId,
      userId,
      action: 'CREATE',
      resourceType: 'case',
      resourceId: created.id,
      after: { id: created.id, title: created.title, legalArea: created.legalArea },
    });

    revalidatePath('/processos');
    revalidatePath('/dashboard');
    return { success: true, data: { id: created.id } };
  } catch (e) {
    console.error('[createCaseAction]', e);
    return { success: false, error: 'Erro interno ao criar processo' };
  }
}

export async function updateCaseAction(
  id: string,
  input: z.infer<typeof updateCaseSchema>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId } = await requireSession();
    const parsed = updateCaseSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

    const existing = await prisma.case.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) return { success: false, error: 'Processo não encontrado' };

    const data = parsed.data;
    const filingDate = data.filingDate !== undefined ? (data.filingDate ? new Date(data.filingDate) : undefined) : undefined;

    const updated = await prisma.case.update({
      where: { id },
      data: {
        ...data,
        filingDate,
        caseValueCents: data.caseValueCents != null ? BigInt(data.caseValueCents) : undefined,
        searchText: `${data.title ?? existing.title} ${data.court ?? existing.court ?? ''}`.toLowerCase(),
      } as Parameters<typeof prisma.case.update>[0]['data'],
    });

    await audit({ tenantId, userId, action: 'UPDATE', resourceType: 'case', resourceId: id, before: existing, after: updated });
    revalidatePath('/processos');
    revalidatePath(`/processos/${id}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (e) {
    console.error('[updateCaseAction]', e);
    return { success: false, error: 'Erro interno ao atualizar processo' };
  }
}

export async function archiveCaseAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId } = await requireSession();
    await prisma.case.update({ where: { id, tenantId }, data: { status: 'ARCHIVED', archivedAt: new Date() } });
    await audit({ tenantId, userId, action: 'UPDATE', resourceType: 'case', resourceId: id, after: { action: 'archived' } });
    revalidatePath('/processos');
    revalidatePath('/dashboard');
    return { success: true };
  } catch {
    return { success: false, error: 'Erro interno ao arquivar processo' };
  }
}

export async function deleteCaseAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId } = await requireSession();
    await prisma.case.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
    await audit({ tenantId, userId, action: 'DELETE', resourceType: 'case', resourceId: id });
    revalidatePath('/processos');
    revalidatePath('/dashboard');
    return { success: true };
  } catch {
    return { success: false, error: 'Erro interno ao deletar processo' };
  }
}

// === Movement Actions ===

export async function addMovementAction(
  caseId: string,
  input: z.infer<typeof movementSchema>,
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  try {
    const { userId, tenantId } = await requireSession();
    const parsed = movementSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

    const existingCase = await prisma.case.findFirst({ where: { id: caseId, tenantId } });
    if (!existingCase) return { success: false, error: 'Processo não encontrado' };

    const last = await prisma.caseMovement.findFirst({ where: { caseId }, orderBy: { sequence: 'desc' } });
    const sequence = (last?.sequence ?? 0) + 1;

    let deadlineEndsAt: Date | undefined;
    if (parsed.data.deadlineDays && parsed.data.occurredAt) {
      const days = parsed.data.deadlineDays;
      const base = new Date(parsed.data.occurredAt);
      if (parsed.data.deadlineKind === 'UTEIS') {
        let added = 0;
        const d = new Date(base);
        while (added < days) {
          d.setDate(d.getDate() + 1);
          const day = d.getDay();
          if (day !== 0 && day !== 6) added++;
        }
        deadlineEndsAt = d;
      } else {
        deadlineEndsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
      }
    }

    const movement = await prisma.caseMovement.create({
      data: {
        tenantId,
        caseId,
        sequence,
        title: parsed.data.title,
        description: parsed.data.description,
        occurredAt: new Date(parsed.data.occurredAt),
        code: parsed.data.code,
        isFatal: parsed.data.isFatal,
        deadlineDays: parsed.data.deadlineDays,
        deadlineKind: parsed.data.deadlineKind,
        deadlineEndsAt,
        attachments: parsed.data.attachments,
        source: 'MANUAL',
        createdById: userId,
      },
    });

    await prisma.case.update({ where: { id: caseId }, data: { updatedAt: new Date() } });
    await audit({ tenantId, userId, action: 'CREATE', resourceType: 'case_movement', resourceId: movement.id, after: { caseId } });

    revalidatePath(`/processos/${caseId}`);
    return { success: true, data: { id: movement.id } };
  } catch (e) {
    console.error('[addMovementAction]', e);
    return { success: false, error: 'Erro interno ao adicionar andamento' };
  }
}
