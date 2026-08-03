'use client';

import { format } from 'date-fns';
import { Bell, Clock, CheckSquare, Activity, AlertTriangle, Check, ChevronRight } from 'lucide-react';
import { Badge } from '@juris-flow/ui';
import { markNotificationRead } from '@/lib/actions/notifications';
import { revalidatePath } from 'next/cache';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  sentAt: Date | null;
  readAt: Date | null;
  error: string | null;
  resourceType: string | null;
  resourceId: string | null;
};

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  DEADLINE_3_DAYS: { icon: Clock, color: 'text-amber-500', label: 'Lembrete (3 dias)' },
  DEADLINE_1_DAY: { icon: Clock, color: 'text-amber-400', label: 'Lembrete (1 dia)' },
  DEADLINE_TODAY: { icon: AlertTriangle, color: 'text-prazo-400', label: 'Vence hoje!' },
  TASK_ASSIGNED: { icon: CheckSquare, color: 'text-vara-400', label: 'Tarefa atribuída' },
  CASE_STATUS_CHANGE: { icon: Activity, color: 'text-blue-400', label: 'Status alterado' },
  SYSTEM_ANNOUNCEMENT: { icon: Bell, color: 'text-ink-400', label: 'Sistema' },
};
const DEFAULT_CFG = TYPE_CONFIG.SYSTEM_ANNOUNCEMENT;

export function NotificationHistory({ notifications, userId }: { notifications: Notification[]; userId: string }) {
  async function handleRead(id: string) {
    await markNotificationRead(id, userId);
    revalidatePath('/configuracoes/notificacoes');
  }

  if (notifications.length === 0) {
    return (
      <p className="text-sm text-ink-500 text-center py-6">
        Nenhuma notificação enviada ainda.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-ink-800">
      {notifications.map((n) => {
        const cfg = (TYPE_CONFIG[n.type] ?? DEFAULT_CFG)!;
        const Icon = cfg.icon;
        const isRead = !!n.readAt;
        const hadError = !!n.error;

        return (
          <li
            key={n.id}
            className={`flex items-start gap-3 py-3 ${isRead ? 'opacity-60' : ''}`}
          >
            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${isRead ? 'text-ink-400' : 'text-ink-100'}`}>
                {n.title}
              </p>
              <p className="text-xs text-ink-500 mt-0.5">{n.body}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-ink-600">
                  {n.sentAt ? format(new Date(n.sentAt), "dd/MM/yyyy 'às' HH:mm") : '—'}
                </span>
                {hadError && (
                  <Badge variant="danger" className="text-[9px] py-0">Erro</Badge>
                )}
              </div>
            </div>
            {!isRead && (
              <button
                type="button"
                onClick={() => handleRead(n.id)}
                className="shrink-0 text-ink-500 hover:text-improcede-400 p-1"
                title="Marcar como lida"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
