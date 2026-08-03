import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updatePieceTextAction } from '@/lib/actions/pieces';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

/**
 * PATCH /api/pieces/[id]/text
 * Salva edição manual do texto (refinamento).
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  try {
    const body = await req.json();
    if (typeof body.text !== 'string') {
      return NextResponse.json({ error: 'text ausente' }, { status: 400 });
    }
    const result = await updatePieceTextAction(params.id, body.text);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[PATCH /api/pieces/text]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}