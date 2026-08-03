import { NextResponse } from 'next/server';
import { runDeadlineReminders, runTaskNotifications } from '@/lib/actions/notifications';

/**
 * GET /api/cron/notifications
 *
 * Executa o processamento de notificações pendentes.
 *
 * Proteção: Bearer token no header Authorization.
 * Configure CRON_SECRET no .env e no seu scheduler externo (Vercel Cron, GitHub Actions, etc.).
 *
 * Exemplo Vercel (vercel.json):
 * {
 *   "crons": [{ "path": "/api/cron/notifications", "schedule": "0 8 * * *" }]
 * }
 *
 * Exemplo GitHub Actions (chamado diariamente às 8h BRT):
 * curl -H "Authorization: Bearer $CRON_SECRET" https://seu-dominio.com/api/cron/notifications
 */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const expectedToken = process.env.CRON_SECRET ?? '';

  // Se CRON_SECRET não estiver configurado, bloqueia em produção
  if (expectedToken && token !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!expectedToken && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'CRON_SECRET não configurado' }, { status: 500 });
  }

  const start = Date.now();
  const [deadlineResult, taskResult] = await Promise.all([
    runDeadlineReminders(),
    runTaskNotifications(),
  ]);

  const totalSent = deadlineResult.sent + taskResult.sent;
  const totalErrors = deadlineResult.errors + taskResult.errors;
  const duration = Date.now() - start;

  console.log(`[cron/notifications] ${totalSent} enviados, ${totalErrors} erros em ${duration}ms`);

  return NextResponse.json({
    ok: true,
    deadlineReminders: deadlineResult,
    taskNotifications: taskResult,
    total: { sent: totalSent, errors: totalErrors, durationMs: duration },
  });
}
