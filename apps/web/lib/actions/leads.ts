'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma, audit } from '@juris-flow/db';

const createLeadSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  source: z.string().default('ORGANIC'),
  status: z.string().default('NEW'),
  legalArea: z.string().optional(),
  estimatedValueCents: z.number().int().nonnegative().optional(),
  probability: z.number().int().min(0).max(100).default(10),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string()).default([]),
  nextActionAt: z.string().optional(),
  nextAction: z.string().optional(),
});

const updateLeadSchema = createLeadSchema.partial();

async function requireSession() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Sessão inválida');
  return { userId: session.user.id, tenantId: session.user.tenantId };
}

export async function createLeadAction(
  input: z.infer<typeof createLeadSchema>,
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  try {
    const { userId, tenantId } = await requireSession();
    const parsed = createLeadSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message };
    }
    const data = parsed.data;
    const created = await prisma.lead.create({
      data: {
        tenantId,
        fullName: data.fullName,
        email: data.email || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        source: data.source as never,
        status: data.status as never,
        legalArea: (data.legalArea || null) as never,
        estimatedValueCents: data.estimatedValueCents != null ? BigInt(data.estimatedValueCents) : null,
        probability: data.probability,
        notes: data.notes || null,
        tags: data.tags,
        nextActionAt: data.nextActionAt ? new Date(data.nextActionAt) : null,
        nextAction: data.nextAction || null,
        responsibleUserId: userId,
      },
    });
    await audit({
      tenantId,
      userId,
      action: 'CREATE',
      resourceType: 'lead',
      resourceId: created.id,
      after: { id: created.id, status: created.status },
    });
    revalidatePath('/leads');
    revalidatePath('/dashboard');
    return { success: true, data: { id: created.id } };
  } catch (e) {
    console.error('[createLeadAction]', e);
    return { success: false, error: 'Erro interno ao criar lead' };
  }
}

export async function updateLeadAction(
  id: string,
  input: z.infer<typeof updateLeadSchema>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId } = await requireSession();
    const parsed = updateLeadSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };
    const existing = await prisma.lead.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) return { success: false, error: 'Lead não encontrado' };

    const data = parsed.data;
    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...data,
        estimatedValueCents: data.estimatedValueCents != null ? BigInt(data.estimatedValueCents) : undefined,
        nextActionAt: data.nextActionAt !== undefined
          ? data.nextActionAt ? new Date(data.nextActionAt) : null
          : undefined,
      } as Parameters<typeof prisma.lead.update>[0]['data'],
    });
    await audit({
      tenantId,
      userId,
      action: 'UPDATE',
      resourceType: 'lead',
      resourceId: id,
      before: existing,
      after: updated,
    });
    revalidatePath('/leads');
    revalidatePath(`/leads/${id}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (e) {
    console.error('[updateLeadAction]', e);
    return { success: false, error: 'Erro interno ao atualizar lead' };
  }
}

/**
 * Movimenta lead entre colunas do funil. Aceita também mudança de status.
 */
export async function moveLeadAction(
  id: string,
  newStatus: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId } = await requireSession();
    const existing = await prisma.lead.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) return { success: false, error: 'Lead não encontrado' };

    const updated = await prisma.lead.update({
      where: { id },
      data: { status: newStatus as never },
    });
    await audit({
      tenantId,
      userId,
      action: 'UPDATE',
      resourceType: 'lead',
      resourceId: id,
      before: { status: existing.status },
      after: { status: updated.status },
    });
    revalidatePath('/leads');
    revalidatePath(`/leads/${id}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (e) {
    console.error('[moveLeadAction]', e);
    return { success: false, error: 'Erro interno' };
  }
}

export async function deleteLeadAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId } = await requireSession();
    await prisma.lead.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
    await audit({ tenantId, userId, action: 'DELETE', resourceType: 'lead', resourceId: id });
    revalidatePath('/leads');
    revalidatePath('/dashboard');
    return { success: true };
  } catch {
    return { success: false, error: 'Erro interno' };
  }
}

/**
 * Converte lead ganho em cliente. Cria Person + Client em transação.
 */
export async function convertLeadToClientAction(
  id: string,
): Promise<{ success: boolean; data?: { clientId: string; personId: string }; error?: string }> {
  try {
    const { userId, tenantId } = await requireSession();
    const lead = await prisma.lead.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!lead) return { success: false, error: 'Lead não encontrado' };

    // Se já convertido
    if (lead.convertedClientId) {
      return { success: true, data: { clientId: lead.convertedClientId, personId: '' } };
    }

    // Cria Person + Client + vincula
    const result = await prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: {
          tenantId,
          kind: 'PF',
          fullName: lead.fullName,
          email: lead.email,
          phone: lead.phone,
          whatsapp: lead.whatsapp,
          notes: lead.notes,
          tags: lead.tags,
          source: 'CLIENT',
        },
      });
      const client = await tx.client.create({
        data: {
          tenantId,
          personId: person.id,
          status: 'ACTIVE',
        },
      });
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: 'WON',
          convertedClientId: client.id,
          convertedAt: new Date(),
        },
      });
      return { client, person };
    });

    await audit({
      tenantId,
      userId,
      action: 'CREATE',
      resourceType: 'client',
      resourceId: result.client.id,
      after: { fromLead: lead.id, personId: result.person.id },
    });
    await audit({
      tenantId,
      userId,
      action: 'UPDATE',
      resourceType: 'lead',
      resourceId: lead.id,
      after: { status: 'WON', convertedClientId: result.client.id },
    });

    revalidatePath('/leads');
    revalidatePath(`/leads/${id}`);
    revalidatePath('/clients');
    revalidatePath('/dashboard');

    return { success: true, data: { clientId: result.client.id, personId: result.person.id } };
  } catch (e) {
    console.error('[convertLeadToClientAction]', e);
    return { success: false, error: 'Erro interno na conversão' };
  }
}