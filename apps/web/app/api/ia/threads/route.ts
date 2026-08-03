import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ia/threads
 * Lista threads do usuário autenticado.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const { id: userId } = session.user;
  const tenantId = session.user.tenantId;

  const threads = await prisma.aiThread.findMany({
    where: { tenantId, userId, archived: false },
    select: {
      id: true,
      title: true,
      caseId: true,
      agentHint: true,
      updatedAt: true,
      case: { select: { id: true, title: true } },
      messages: { take: 1, orderBy: { createdAt: 'desc' }, select: { content: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ threads });
}

/**
 * POST /api/ia/threads
 * Cria nova thread.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const { id: userId } = session.user;
  const tenantId = session.user.tenantId;

  const body = (await req.json().catch(() => ({}))) as { title?: string; caseId?: string };

  const thread = await prisma.aiThread.create({
    data: {
      tenantId,
      userId,
      title: body.title ?? 'Nova conversa',
      caseId: body.caseId,
    },
  });

  return NextResponse.json({ thread });
}
