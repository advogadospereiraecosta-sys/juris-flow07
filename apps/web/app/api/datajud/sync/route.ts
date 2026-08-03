import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sincronizarCasoDataJudAction } from '@/lib/actions/datajud-sync';

export const dynamic = 'force-dynamic';

/**
 * POST /api/datajud/sync
 * Body: { caseId: string }
 *
 * Sincroniza as movimentações de um processo com o DataJud.
 * Auto-cria Publications fatais + Tasks para o responsável do caso.
 */
export async function POST(req: Request) {
  const session = await auth();
  console.log('[datajud sync] session:', {
    userId: session?.user?.id,
    tenantId: session?.user?.tenantId,
    email: session?.user?.email,
  });
  if (!session?.user?.tenantId) {
    return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  if (!body.caseId) {
    return NextResponse.json({ success: false, error: 'caseId obrigatório' }, { status: 400 });
  }

  const result = await sincronizarCasoDataJudAction(body.caseId);
  console.log('[datajud sync] result:', result);
  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
