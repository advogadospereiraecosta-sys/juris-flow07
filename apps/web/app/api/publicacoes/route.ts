import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { criarPublicacaoAction } from '@/lib/actions/publicacoes';

export const dynamic = 'force-dynamic';

/**
 * POST /api/publicacoes
 * Body: { rawText, source?, publishedAt?, prazoDias? }
 *
 * Cria uma publicação a partir do texto colado.
 * Auto-detecta CNJ, OAB, partes, tipo de intimação → calcula prazo fatal.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const result = await criarPublicacaoAction(body);

  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
