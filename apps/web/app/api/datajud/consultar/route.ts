import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { consultarProcessoDataJudAction } from '@/lib/actions/datajud';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/datajud/consultar
 *
 * Body: { cnj: string, tribunal?: string }
 *
 * Retorna os dados do processo vindos do DataJud (CNJ).
 * Inclui classe real, partes, valor da causa, status, última movimentação.
 *
 * Se a chave DATAJUD_API_KEY não estiver configurada, retorna
 * { ok: false, error: '...' } — o frontend trata graciosamente
 * continuando com os dados do parser local de CNJ.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { cnj?: string; tribunal?: string };
  if (!body.cnj) {
    return NextResponse.json({ error: 'CNJ obrigatório' }, { status: 400 });
  }

  const result = await consultarProcessoDataJudAction({
    cnj: body.cnj,
    tribunal: body.tribunal,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 200 });
  }

  return NextResponse.json({
    ok: true,
    data: result.data,
    areaJuridica: result.areaJuridica,
    cached: result.cached,
  });
}

// Exports só pra satisfazer o linter quando há imports não usados
void UUID_RE;
