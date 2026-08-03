import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sincronizarTodosCasosAction } from '@/lib/actions/datajud-sync';
import { prisma } from '@juris-flow/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/datajud-sync
 *
 * Job diário que sincroniza movimentações de todos os processos ACTIVE
 * do tenant com o DataJud (CNJ).
 *
 * Modo "me": sincroniza o tenant do usuário da sessão.
 * Modo "all": itera todos os tenants (uso por cron externo).
 *
 * Protegido por CRON_SECRET (Bearer token).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const expected = process.env.CRON_SECRET ?? '';

  if (expected && token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!expected && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'CRON_SECRET não configurado' }, { status: 500 });
  }

  // Determina escopo
  const url = new URL(req.url);
  const scope = url.searchParams.get('scope') ?? 'me';

  if (scope === 'all') {
    const tenants = await prisma.tenant.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });

    let totalCreated = 0;
    const results: Array<{ tenant: string; total: number; sucess: number; erros: number }> = [];

    for (const t of tenants) {
      const r = await sincronizarTodosCasosAction(t.id);
      if (r.success) {
        const inner = r as { total: number; sucessos: number; erros: number; movimentacoesCriadas: number };
        results.push({
          tenant: t.id.slice(0, 8),
          total: inner.total,
          sucess: inner.sucessos,
          erros: inner.erros,
        });
        totalCreated += inner.movimentacoesCriadas;
      }
    }

    return NextResponse.json({ ok: true, scope: 'all', results, totalCreated });
  }

  // Modo "me" — tenant do usuário logado
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const r = await sincronizarTodosCasosAction();
  return NextResponse.json({ ok: r.success, ...r });
}
