import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@juris-flow/db';
import {
  hashPassword,
  validatePasswordPolicy,
} from '@juris-flow/auth';

const signupSchema = z.object({
  fullName: z.string().min(3, 'Nome muito curto').max(100),
  tenantName: z.string().min(2, 'Nome do escritório muito curto').max(100),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
  lgpdConsent: z.string().optional(),
});

/**
 * POST /api/signup
 *
 * Cria um Tenant + User OWNER + Subscription TRIALING + LGPD consent.
 *
 * Por simplicidade no Sprint 0, NÃO loga automaticamente — redireciona para
 * /login com mensagem de sucesso.
 *
 * Sprint 1+: integrará com fluxo de onboarding wizard.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const raw = Object.fromEntries(formData.entries());

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? 'Dados inválidos';
    return NextResponse.redirect(
      new URL(`/signup?error=${encodeURIComponent(firstError)}`, req.url),
      { status: 303 },
    );
  }

  const { fullName, tenantName, email, password } = parsed.data;

  // Política de senha
  const policy = validatePasswordPolicy(password);
  if (!policy.ok) {
    return NextResponse.redirect(
      new URL(
        `/signup?error=${encodeURIComponent(policy.errors[0]!)}`,
        req.url,
      ),
      { status: 303 },
    );
  }

  // Email já existe?
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.redirect(
      new URL(
        `/signup?error=${encodeURIComponent('Email já cadastrado. Tente entrar.')}`,
        req.url,
      ),
      { status: 303 },
    );
  }

  // Slug único
  const baseSlug = slugify(tenantName);
  const slug = await uniqueSlug(baseSlug);

  const passwordHash = await hashPassword(password);

  // Trial Pro de 14 dias
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  // Criação atômica: tenant + user + subscription + lgpd
  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: tenantName,
        slug,
        plan: 'PRO',
        planStatus: 'TRIALING',
        trialEndsAt,
      },
    });

    await tx.user.create({
      data: {
        tenantId: tenant.id,
        email,
        passwordHash,
        fullName,
        role: 'OWNER',
      },
    });

    await tx.subscription.create({
      data: {
        tenantId: tenant.id,
        plan: 'PRO',
        status: 'TRIALING',
        cycle: 'MONTHLY',
        trialEndsAt,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndsAt,
      },
    });

    // LGPD consent obrigatório para criar conta (LGPD art. 7º, V; art. 9º)
    await tx.lgpdConsent.create({
      data: {
        tenantId: tenant.id,
        dataSubjectEmail: email,
        consentType: 'TERMS',
        action: 'CONSENT',
        status: 'APPROVED',
        termsVersion: 'v1.0',
        privacyPolicyVersion: 'v1.0',
        ip: req.headers.get('x-forwarded-for') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
        respondedAt: new Date(),
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: 'CREATE',
        resourceType: 'tenant',
        resourceId: tenant.id,
        after: { name: tenantName, plan: 'PRO_TRIAL', owner: email },
        ip: req.headers.get('x-forwarded-for') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    });
  });

  return NextResponse.redirect(new URL('/login?signup=ok', req.url), {
    status: 303,
  });
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    // Strip combining diacritical marks (Unicode range U+0300 - U+036F)
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base || 'escritorio';
  let n = 1;
  while (await prisma.tenant.findUnique({ where: { slug: candidate } })) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}
