import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createLeadAction } from '@/lib/actions/leads';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  if (!['OWNER', 'PARTNER', 'LAWYER', 'ASSISTANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const result = await createLeadAction(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.data, { status: 201 });
  } catch (e) {
    console.error('[POST /api/leads]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}