import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@juris-flow/ui';
import { Bell, Clock, CheckSquare, Activity, Save } from 'lucide-react';
import { NotificationPreferencesForm } from '@/components/notifications/preferences-form';
import { NotificationHistory } from '@/components/notifications/history-list';

export const metadata = { title: 'Notificações — Juris-Flow' };

export default async function NotificacoesPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const [user, notifications] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailNotificationsEnabled: true,
        deadlineReminders: true,
        taskNotifications: true,
        processStatusChanges: true,
      },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { sentAt: 'desc' },
      take: 30,
    }),
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="vf-display-md text-2xl font-bold text-ink-50">Notificações</h1>
        <p className="vf-caption text-ink-400 mt-0.5">
          Gerencie como e quando recebe alertas do Juris-Flow.
        </p>
      </div>

      {/* Preferências */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-vara-400" />
            Preferências de e-mail
          </CardTitle>
          <CardDescription>
            Desative os tipos de notificação que não são relevantes para o seu fluxo de trabalho.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationPreferencesForm
            initial={{
              emailNotificationsEnabled: user?.emailNotificationsEnabled ?? true,
              deadlineReminders: user?.deadlineReminders ?? true,
              taskNotifications: user?.taskNotifications ?? true,
              processStatusChanges: user?.processStatusChanges ?? true,
            }}
          />
        </CardContent>
      </Card>

      {/* Histórico */}
      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-vara-400" />
              Histórico de notificações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationHistory notifications={notifications} userId={userId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
