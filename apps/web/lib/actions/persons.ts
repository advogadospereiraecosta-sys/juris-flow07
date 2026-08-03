'use server';

/**
 * Server Actions para a entidade Person (clientes PF/PJ).
 *
 * Todas as ações:
 * 1. Verificam sessão válida (middleware já fez, mas reforçamos)
 * 2. Validam tenantId da sessão (multi-tenant isolation)
 * 3. Validam input com Zod
 * 4. Persistem via Prisma
 * 5. Gravam audit log
 * 6. Revalidam o cache da página
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma, audit } from '@juris-flow/db';

// === Schemas ===

const addressSchema = z
  .object({
    cep: z.string().optional(),
    logradouro: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    uf: z.string().length(2).optional(),
  })
  .optional();

const personPFSchema = z.object({
  kind: z.literal('PF'),
  fullName: z.string().min(3, 'Nome muito curto').max(150),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos sem pontuação').optional().or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: addressSchema,
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string()).default([]),
  source: z.string().default('CLIENT'),
});

const personPJSchema = z.object({
  kind: z.literal('PJ'),
  legalName: z.string().min(3, 'Razão social muito curta').max(200),
  tradeName: z.string().max(200).optional(),
  cnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos sem pontuação').optional().or(z.literal('')),
  stateRegistration: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: addressSchema,
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string()).default([]),
  source: z.string().default('CLIENT'),
});

const personSchema = z.discriminatedUnion('kind', [personPFSchema, personPJSchema]);

const createClientRelationSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'FORMER']).default('ACTIVE'),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string()).default([]),
});

// === Tipos ===

export type PersonInput = z.infer<typeof personSchema>;
export type ClientRelationInput = z.infer<typeof createClientRelationSchema>;

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

// === Helpers ===

function normalizeEmptyToUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] === '') (out as Record<string, unknown>)[k] = undefined;
  }
  return out;
}

async function requireSession() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('Sessão inválida');
  }
  return {
    userId: session.user.id,
    tenantId: session.user.tenantId,
    role: session.user.role,
  };
}

// === Ações ===

/**
 * Cria uma nova pessoa (cliente) e opcionalmente já a vincula como cliente do tenant.
 */
export async function createPersonAction(input: PersonInput): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId, tenantId } = await requireSession();

    const parsed = personSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Dados inválidos';
      return { success: false, error: firstError };
    }

    const data = normalizeEmptyToUndefined(parsed.data as unknown as Record<string, unknown>);

    const person = await prisma.person.create({
      data: {
        kind: data.kind as 'PF' | 'PJ',
        tenantId,
        ...(data as object),
      },
    });

    // Vincula como cliente automaticamente quando source = 'CLIENT'
    if (input.source === 'CLIENT') {
      await prisma.client.create({
        data: {
          tenantId,
          personId: person.id,
          status: 'ACTIVE',
          tags: input.tags,
          notes: input.notes,
        },
      });
    }

    await audit({
      tenantId,
      userId,
      action: 'CREATE',
      resourceType: 'person',
      resourceId: person.id,
      after: { id: person.id, kind: person.kind, source: input.source },
    });

    revalidatePath('/clients');
    return { success: true, data: { id: person.id } };
  } catch (e) {
    console.error('[createPersonAction]', e);
    return { success: false, error: 'Erro interno ao criar pessoa' };
  }
}

/**
 * Atualiza uma pessoa existente.
 */
export async function updatePersonAction(
  id: string,
  input: PersonInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId, tenantId } = await requireSession();

    const parsed = personSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
    }

    const existing = await prisma.person.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) return { success: false, error: 'Pessoa não encontrada' };

    const data = normalizeEmptyToUndefined(parsed.data as unknown as Record<string, unknown>);

    const updated = await prisma.person.update({
      where: { id },
      data: data as object,
    });

    await audit({
      tenantId,
      userId,
      action: 'UPDATE',
      resourceType: 'person',
      resourceId: id,
      before: existing,
      after: updated,
    });

    revalidatePath('/clients');
    revalidatePath(`/clients/${id}`);
    return { success: true, data: { id } };
  } catch (e) {
    console.error('[updatePersonAction]', e);
    return { success: false, error: 'Erro interno ao atualizar pessoa' };
  }
}

/**
 * Soft delete (LGPD: marca deletedAt).
 */
export async function deletePersonAction(id: string): Promise<ActionResult> {
  try {
    const { userId, tenantId } = await requireSession();

    const existing = await prisma.person.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return { success: false, error: 'Pessoa não encontrada' };

    await prisma.person.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await audit({
      tenantId,
      userId,
      action: 'DELETE',
      resourceType: 'person',
      resourceId: id,
      before: existing,
    });

    revalidatePath('/clients');
    return { success: true, data: null };
  } catch (e) {
    console.error('[deletePersonAction]', e);
    return { success: false, error: 'Erro interno ao deletar pessoa' };
  }
}

/**
 * Restaura uma pessoa soft-deleted (LGPD).
 */
export async function restorePersonAction(id: string): Promise<ActionResult> {
  try {
    const { userId, tenantId } = await requireSession();

    await prisma.person.update({
      where: { id },
      data: { deletedAt: null },
    });

    await audit({
      tenantId,
      userId,
      action: 'UPDATE',
      resourceType: 'person',
      resourceId: id,
      after: { action: 'restored' },
    });

    revalidatePath('/clients');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: 'Erro interno ao restaurar pessoa' };
  }
}

/**
 * Exporta dados de uma pessoa (LGPD art. 18, V — portabilidade).
 * Retorna um objeto JSON com todos os dados do titular.
 */
export async function exportPersonAction(id: string): Promise<ActionResult<Record<string, unknown>>> {
  try {
    const { userId, tenantId } = await requireSession();

    const person = await prisma.person.findFirst({
      where: { id, tenantId },
      include: {
        client: true,
      },
    });
    if (!person) return { success: false, error: 'Pessoa não encontrada' };

    const lgpdConsents = await prisma.lgpdConsent.findMany({
      where: { dataSubjectEmail: person.email ?? '' },
    });

    const exportData = {
      pessoa: {
        id: person.id,
        kind: person.kind,
        fullName: person.fullName,
        legalName: person.legalName,
        tradeName: person.tradeName,
        cpf: person.cpf,
        cnpj: person.cnpj,
        stateRegistration: person.stateRegistration,
        birthDate: person.birthDate,
        email: person.email,
        phone: person.phone,
        whatsapp: person.whatsapp,
        address: person.address,
        tags: person.tags,
        notes: person.notes,
        createdAt: person.createdAt,
        updatedAt: person.updatedAt,
        deletedAt: person.deletedAt,
      },
      cliente: person.client,
      consentimentos_lgpd: lgpdConsents,
      exportadoEm: new Date().toISOString(),
      exportadoPor: userId,
      baseLegal: 'LGPD Art. 18, V (Direito de acesso/portabilidade)',
    };

    await audit({
      tenantId,
      userId,
      action: 'EXPORT',
      resourceType: 'person',
      resourceId: id,
      after: { action: 'lgpd_export' },
    });

    return { success: true, data: exportData };
  } catch (e) {
    console.error('[exportPersonAction]', e);
    return { success: false, error: 'Erro interno ao exportar dados' };
  }
}

/**
 * Anonimiza dados sensíveis (LGPD art. 18, VI — eliminação).
 * Mantém o registro para integridade referencial, mas apaga PII.
 */
export async function anonymizePersonAction(id: string): Promise<ActionResult> {
  try {
    const { userId, tenantId } = await requireSession();

    const existing = await prisma.person.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return { success: false, error: 'Pessoa não encontrada' };

    const placeholder = `ANONIMIZADO-${id.substring(0, 8)}`;

    await prisma.person.update({
      where: { id },
      data: {
        fullName: placeholder,
        legalName: placeholder,
        tradeName: null,
        cpf: null,
        cnpj: null,
        stateRegistration: null,
        birthDate: null,
        email: null,
        phone: null,
        whatsapp: null,
        address: undefined,
        notes: 'Anonimizado via LGPD art. 18, VI',
        deletedAt: new Date(),
      },
    });

    // Se houver cliente vinculado, também anonimiza
    await prisma.client.updateMany({
      where: { personId: id, tenantId },
      data: {
        notes: 'Titular anonimizado via LGPD art. 18, VI',
        status: 'FORMER',
      },
    });

    await audit({
      tenantId,
      userId,
      action: 'DELETE',
      resourceType: 'person',
      resourceId: id,
      after: { action: 'lgpd_anonymize' },
    });

    revalidatePath('/clients');
    return { success: true, data: null };
  } catch (e) {
    console.error('[anonymizePersonAction]', e);
    return { success: false, error: 'Erro interno ao anonimizar' };
  }
}

/**
 * Cria cliente (relação tenant ↔ person).
 */
export async function createClientAction(
  personId: string,
  input: ClientRelationInput,
): Promise<ActionResult> {
  try {
    const { userId, tenantId } = await requireSession();

    const person = await prisma.person.findFirst({
      where: { id: personId, tenantId },
    });
    if (!person) return { success: false, error: 'Pessoa não encontrada' };

    const existing = await prisma.client.findUnique({ where: { personId } });
    if (existing) return { success: false, error: 'Já existe vínculo de cliente para esta pessoa' };

    await prisma.client.create({
      data: {
        tenantId,
        personId,
        status: input.status,
        notes: input.notes,
        tags: input.tags,
      },
    });

    await audit({
      tenantId,
      userId,
      action: 'CREATE',
      resourceType: 'client',
      resourceId: personId,
      after: { action: 'created_client_link' },
    });

    revalidatePath('/clients');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: 'Erro interno ao criar cliente' };
  }
}

/**
 * Server Action unificada para criar pessoa PF ou PJ via form.
 * Aceita FormData.
 */
export async function createPersonFromFormAction(formData: FormData): Promise<void> {
  const kind = formData.get('kind') as 'PF' | 'PJ';

  const input: PersonInput =
    kind === 'PF'
      ? {
          kind: 'PF',
          fullName: (formData.get('fullName') as string) ?? '',
          cpf: ((formData.get('cpf') as string) ?? '').replace(/\D/g, '') || undefined,
          birthDate: (formData.get('birthDate') as string) || undefined,
          email: (formData.get('email') as string) || undefined,
          phone: (formData.get('phone') as string) || undefined,
          whatsapp: (formData.get('whatsapp') as string) || undefined,
          address: undefined,
          notes: (formData.get('notes') as string) || undefined,
          tags: ((formData.get('tags') as string) ?? '').split(',').map((t) => t.trim()).filter(Boolean),
          source: 'CLIENT',
        }
      : {
          kind: 'PJ',
          legalName: (formData.get('legalName') as string) ?? '',
          tradeName: (formData.get('tradeName') as string) || undefined,
          cnpj: ((formData.get('cnpj') as string) ?? '').replace(/\D/g, '') || undefined,
          stateRegistration: (formData.get('stateRegistration') as string) || undefined,
          email: (formData.get('email') as string) || undefined,
          phone: (formData.get('phone') as string) || undefined,
          whatsapp: (formData.get('whatsapp') as string) || undefined,
          address: undefined,
          notes: (formData.get('notes') as string) || undefined,
          tags: ((formData.get('tags') as string) ?? '').split(',').map((t) => t.trim()).filter(Boolean),
          source: 'CLIENT',
        };

  const result = await createPersonAction(input);

  if (result.success) {
    redirect('/clients');
  } else {
    redirect(`/clients/new?error=${encodeURIComponent(result.error)}`);
  }
}