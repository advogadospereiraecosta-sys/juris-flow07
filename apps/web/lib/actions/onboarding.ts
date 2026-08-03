'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma, audit } from '@juris-flow/db';
import { z } from 'zod';

const step1Schema = z.object({
  acceptedTerms: z.literal('on'),
  acceptedPrivacy: z.literal('on'),
  marketingOptIn: z.string().optional(),
});

const step2Schema = z.object({
  cnpj: z.string().regex(/^\d{14}$/, 'CNPJ inválido'),
  legalName: z.string().min(3),
  tradeName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z
    .object({
      cep: z.string().optional(),
      logradouro: z.string().optional(),
      numero: z.string().optional(),
      bairro: z.string().optional(),
      cidade: z.string().optional(),
      uf: z.string().optional(),
    })
    .optional(),
});

async function requireSession() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Não autenticado');
  return { userId: session.user.id, tenantId: session.user.tenantId };
}

/**
 * Garante que existe um OnboardingProgress para o tenant (cria se não existir).
 */
async function ensureProgress(tenantId: string, userId: string) {
  const existing = await prisma.onboardingProgress.findUnique({ where: { tenantId } });
  if (existing) return existing;
  return prisma.onboardingProgress.create({
    data: {
      tenantId,
      userId,
      currentStep: 1,
    },
  });
}

/**
 * Salva Step 1: aceite dos termos (LGPD).
 * Grava também em LgpdConsent (audit trail oficial).
 */
export async function saveOnboardingStep1Action(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId } = await requireSession();

    const parsed = step1Schema.safeParse({
      acceptedTerms: formData.get('acceptedTerms'),
      acceptedPrivacy: formData.get('acceptedPrivacy'),
      marketingOptIn: formData.get('marketingOptIn'),
    });
    if (!parsed.success) {
      return { success: false, error: 'Você precisa aceitar os termos de uso e a política de privacidade' };
    }

    const progress = await ensureProgress(tenantId, userId);
    const consents = {
      terms: true,
      privacy: true,
      marketing: parsed.data.marketingOptIn === 'on',
      acceptedAt: new Date().toISOString(),
    };

    await prisma.$transaction([
      prisma.onboardingProgress.update({
        where: { tenantId },
        data: { lgpdConsents: consents, currentStep: 2 },
      }),
      prisma.lgpdConsent.create({
        data: {
          tenantId,
          dataSubjectEmail: (await prisma.user.findUnique({ where: { id: userId } }))?.email ?? 'unknown',
          consentType: 'TERMS',
          action: 'CONSENT',
          status: 'APPROVED',
          termsVersion: 'v1.0',
          privacyPolicyVersion: 'v1.0',
          ip: '0.0.0.0', // em produção, pegar do headers
          userAgent: 'onboarding',
          respondedAt: new Date(),
        },
      }),
      prisma.lgpdConsent.create({
        data: {
          tenantId,
          dataSubjectEmail: (await prisma.user.findUnique({ where: { id: userId } }))?.email ?? 'unknown',
          consentType: 'PRIVACY',
          action: 'CONSENT',
          status: 'APPROVED',
          termsVersion: 'v1.0',
          privacyPolicyVersion: 'v1.0',
          ip: '0.0.0.0',
          userAgent: 'onboarding',
          respondedAt: new Date(),
        },
      }),
    ]);

    await audit({
      tenantId,
      userId,
      action: 'CREATE',
      resourceType: 'onboarding',
      resourceId: progress.id,
      after: { step: 1, consents },
    });

    revalidatePath('/onboarding');
    return { success: true };
  } catch (e) {
    console.error('[saveOnboardingStep1Action]', e);
    return { success: false, error: 'Erro ao salvar consentimentos' };
  }
}

/**
 * Salva Step 2: dados do escritório.
 * Atualiza Tenant.name + document + address.
 */
export async function saveOnboardingStep2Action(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId } = await requireSession();

    const address: Record<string, string> = {};
    for (const key of ['cep', 'logradouro', 'numero', 'bairro', 'cidade', 'uf']) {
      const v = (formData.get(`address.${key}`) as string)?.trim();
      if (v) address[key] = v;
    }

    const parsed = step2Schema.safeParse({
      cnpj: (formData.get('cnpj') as string)?.replace(/\D/g, '') ?? '',
      legalName: formData.get('legalName'),
      tradeName: formData.get('tradeName') || undefined,
      phone: formData.get('phone') || undefined,
      email: formData.get('email') || undefined,
      address: Object.keys(address).length ? address : undefined,
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
    }

    const progress = await ensureProgress(tenantId, userId);
    const officeData = { ...parsed.data, address: address as object | undefined };

    await prisma.$transaction([
      prisma.tenant.update({
        where: { id: tenantId },
        data: {
          name: parsed.data.legalName,
          document: parsed.data.cnpj,
          phone: parsed.data.phone,
          email: parsed.data.email || undefined,
          address: address as object,
        },
      }),
      prisma.onboardingProgress.update({
        where: { tenantId },
        data: { officeData: officeData as object, currentStep: 3 },
      }),
    ]);

    await audit({
      tenantId,
      userId,
      action: 'UPDATE',
      resourceType: 'tenant',
      resourceId: tenantId,
      after: { source: 'onboarding_step2' },
    });

    revalidatePath('/onboarding');
    return { success: true };
  } catch (e) {
    console.error('[saveOnboardingStep2Action]', e);
    return { success: false, error: 'Erro ao salvar dados do escritório' };
  }
}

/**
 * Finaliza o onboarding: marca currentStep=3, completed=true, completedAt=now.
 * Redireciona para dashboard.
 */
export async function finishOnboardingAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId } = await requireSession();

    await prisma.onboardingProgress.update({
      where: { tenantId },
      data: { completed: true, completedAt: new Date(), currentStep: 3 },
    });

    await audit({
      tenantId,
      userId,
      action: 'UPDATE',
      resourceType: 'onboarding',
      resourceId: tenantId,
      after: { completed: true },
    });

    revalidatePath('/onboarding');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (e) {
    console.error('[finishOnboardingAction]', e);
    return { success: false, error: 'Erro ao finalizar onboarding' };
  }
}

/**
 * Pula o onboarding (não recomendado, mas o usuário pode querer).
 */
export async function skipOnboardingAction(): Promise<{ success: boolean }> {
  try {
    const { userId, tenantId } = await requireSession();
    await prisma.onboardingProgress.upsert({
      where: { tenantId },
      create: { tenantId, userId, currentStep: 3, completed: false, completedAt: new Date() },
      update: { completed: false, completedAt: new Date() },
    });
    revalidatePath('/onboarding');
    return { success: true };
  } catch {
    return { success: false };
  }
}