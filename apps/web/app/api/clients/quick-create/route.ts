import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma, audit } from '@juris-flow/db';
import { PersonKind } from '@juris-flow/db';

const quickCreateSchema = z.object({
  kind: z.enum(['PF', 'PJ']),
  name: z.string().min(2).max(200),
  cpfCnpj: z.string().min(11).max(18).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
});

/**
 * POST /api/clients/quick-create
 * Body: { kind, name, cpfCnpj?, email?, phone? }
 *
 * Cria cliente mínimo (PF ou PJ) a partir do form de novo processo.
 * Retorna o cliente criado pra ser auto-selecionado no select.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const { id: userId } = session.user;
  const tenantId = session.user.tenantId;

  const body = await req.json().catch(() => ({}));
  const parsed = quickCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
      { status: 400 },
    );
  }

  const { kind, name, cpfCnpj, email, phone } = parsed.data;
  const isPJ = kind === 'PJ';
  const digits = (cpfCnpj ?? '').replace(/\D/g, '');

  try {
    // Cria Person + Client em transação
    const result = await prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: {
          tenantId,
          kind: isPJ ? PersonKind.PJ : PersonKind.PF,
          fullName: isPJ ? null : name,
          legalName: isPJ ? name : null,
          cpf: isPJ ? null : digits || null,
          cnpj: isPJ ? digits || null : null,
          email: email || null,
          phone: phone || null,
          source: 'CLIENT',
        },
      });

      const client = await tx.client.create({
        data: {
          tenantId,
          personId: person.id,
        },
      });

      return { person, client };
    });

    await audit({
      tenantId,
      userId,
      action: 'CREATE',
      resourceType: 'client',
      resourceId: result.client.id,
      after: { source: 'quick-create', name },
    });

    return NextResponse.json({
      success: true,
      client: {
        // Mantém compat: id do client (mas o FK do banco aponta pra Person)
        id: result.client.id,
        personId: result.person.id,
        name: result.person.legalName ?? result.person.fullName,
        cpf: result.person.cpf,
        cnpj: result.person.cnpj,
      },
    });
  } catch (e) {
    console.error('[quick-create]', e);
    return NextResponse.json(
      { error: 'Erro ao criar cliente. Verifique se o CPF/CNPJ já existe.' },
      { status: 500 },
    );
  }
}
