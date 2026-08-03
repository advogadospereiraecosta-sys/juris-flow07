import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createPieceAction } from '@/lib/actions/pieces';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = await createPieceAction(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ id: result.data.generationId }, { status: 202 });
  } catch (e) {
    console.error('[POST /api/pieces]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}