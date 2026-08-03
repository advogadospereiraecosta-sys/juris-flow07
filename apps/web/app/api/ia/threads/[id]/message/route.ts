import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';
import { runAgenticChat } from '@/lib/ai/agent';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/ia/threads/[id]/message
 * body: { message: string, caseId?: string }
 *
 * Envia mensagem no thread. Retorna SSE com eventos:
 *  - text_delta: fragmento de texto da resposta
 *  - tool_call_start: Claude começou a chamar uma tool
 *  - tool_call_end: tool retornou resultado
 *  - tool_call_error: tool falhou
 *  - done: resposta completa
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const { id: userId } = session.user;
  const tenantId = session.user.tenantId;

  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const thread = await prisma.aiThread.findFirst({
    where: { id: params.id, tenantId },
  });
  if (!thread) {
    return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
  }

  const body = (await req.json()) as { message?: string; caseId?: string };
  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 });
  }

  // Atualiza thread com caseId se enviado
  if (body.caseId && body.caseId !== thread.caseId) {
    await prisma.aiThread.update({
      where: { id: thread.id },
      data: { caseId: body.caseId },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        await runAgenticChat({
          threadId: thread.id,
          tenantId,
          userId,
          caseId: body.caseId ?? thread.caseId,
          userMessage: body.message ?? '',
          onEvent: (e) => {
            send(e.type, e);
          },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro interno';
        send('error', { message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

/**
 * GET /api/ia/threads/[id]/message
 * Lista o histórico do thread.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const { tenantId } = session.user;

  const thread = await prisma.aiThread.findFirst({
    where: { id: params.id, tenantId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!thread) {
    return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
  }

  return NextResponse.json({ thread });
}
