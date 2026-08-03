import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';

/**
 * GET /api/pieces/[id]/status — retorna status + outputText atual.
 * Cliente faz polling a cada 2s até status COMPLETED ou FAILED.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  const piece = await prisma.pieceGeneration.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, deletedAt: null },
    select: {
      id: true, status: true, outputText: true, errorMessage: true,
      inputTokens: true, outputTokens: true, costCents: true,
      completedAt: true, updatedAt: true,
    },
  });
  if (!piece) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
  return NextResponse.json(piece);
}