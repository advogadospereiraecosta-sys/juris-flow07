import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';
import { redirect } from 'next/navigation';
import { ChatWorkspace } from '@/components/ia/chat-workspace';

export const metadata = { title: 'IA Assistant — Juris-Flow' };

export default async function IaPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const tenantId = session?.user?.tenantId;
  if (!userId || !tenantId) redirect('/login');

  const [threads, recentCases] = await Promise.all([
    prisma.aiThread.findMany({
      where: { tenantId, userId, archived: false },
      select: {
        id: true,
        title: true,
        caseId: true,
        agentHint: true,
        updatedAt: true,
        case: { select: { id: true, title: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    }),
    prisma.case.findMany({
      where: { tenantId },
      select: { id: true, title: true },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    }),
  ]);

  return (
    <ChatWorkspace
      initialThreads={threads.map((t) => ({
        id: t.id,
        title: t.title,
        caseId: t.caseId,
        agentHint: t.agentHint,
        updatedAt: t.updatedAt.toISOString(),
        case: t.case ? { id: t.case.id, title: t.case.title } : null,
        messageCount: t._count.messages,
      }))}
      recentCases={recentCases}
    />
  );
}
