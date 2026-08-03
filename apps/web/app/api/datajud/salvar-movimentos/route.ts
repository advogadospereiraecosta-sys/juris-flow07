import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { salvarMovimentosDataJudAction } from '@/lib/actions/datajud';

export const dynamic = 'force-dynamic';

/**
 * POST /api/datajud/salvar-movimentos
 * Body: { caseId: string, cnj: string }
 *
 * Sincroniza as movimentações do processo com o DataJud (CNJ).
 * - Adiciona novos movimentos como CaseMovement
 * - Pula os que já existem (mesmo código + data)
 * - Renumera a sequência temporal
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { caseId?: string; cnj?: string };
  if (!body.caseId || !body.cnj) {
    return NextResponse.json({ success: false, error: 'caseId e cnj obrigatórios' }, { status: 400 });
  }

  const result = await salvarMovimentosDataJudAction({
    caseId: body.caseId,
    cnj: body.cnj,
  });

  if (!result.success) {
    return NextResponse.json(result, { status: 200 });
  }

  return NextResponse.json(result);
}
