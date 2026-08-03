import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma, audit } from '@juris-flow/db';

function normalize(val: unknown): string | undefined {
  const s = String(val ?? '').trim();
  return s || undefined;
}

function parseAddressJson(raw: unknown): Record<string, string> | undefined {
  const s = String(raw ?? '').trim();
  if (!s) return undefined;
  try {
    const parsed = JSON.parse(s);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // Mantém apenas chaves com valor truthy
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string' && v.trim()) cleaned[k] = v.trim();
      }
      return Object.keys(cleaned).length ? cleaned : undefined;
    }
  } catch { /* ignore */ }
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (!['OWNER', 'PARTNER', 'LAWYER', 'ASSISTANT'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await req.formData();
    const kind = body.get('kind') as 'PF' | 'PJ';
    const tenantId = session.user.tenantId;
    const userId = session.user.id;

    if (!['PF', 'PJ'].includes(kind)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    const address = parseAddressJson(body.get('address'));

    const person = await prisma.person.create({
      data: {
        tenantId,
        kind,
        ...(kind === 'PF'
          ? {
              fullName: normalize(body.get('fullName')) ?? 'SEM NOME',
              cpf: normalize(body.get('cpf')),
              birthDate: body.get('birthDate')
                ? new Date(body.get('birthDate') as string)
                : null,
            }
          : {
              legalName: normalize(body.get('legalName')) ?? 'SEM RAZÃO SOCIAL',
              tradeName: normalize(body.get('tradeName')),
              cnpj: normalize(body.get('cnpj')),
              stateRegistration: normalize(body.get('stateRegistration')),
            }),
        email: normalize(body.get('email')),
        phone: normalize(body.get('phone')),
        whatsapp: normalize(body.get('whatsapp')),
        address: address ?? undefined,
        notes: normalize(body.get('notes')),
        tags: normalize(body.get('tags'))
          ? (body.get('tags') as string).split(',').map((t) => t.trim()).filter(Boolean)
          : [],
        source: 'CLIENT',
      },
    });

    // Cria vínculo de cliente
    const client = await prisma.client.create({
      data: {
        tenantId,
        personId: person.id,
        status: 'ACTIVE',
      },
    });

    await audit({
      tenantId,
      userId,
      action: 'CREATE',
      resourceType: 'person',
      resourceId: person.id,
      after: { id: person.id, kind: person.kind, clientId: client.id },
    });

    return NextResponse.json({ id: client.id, personId: person.id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/clients]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
