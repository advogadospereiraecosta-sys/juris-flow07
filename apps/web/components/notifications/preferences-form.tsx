'use client';

import { useState, useTransition } from 'react';
import { Bell, Clock, CheckSquare, Activity, Save, Check } from 'lucide-react';
import { updateNotificationPreferences } from '@/lib/actions/notifications';
import { revalidatePath } from 'next/cache';

type Preferences = {
  emailNotificationsEnabled: boolean;
  deadlineReminders: boolean;
  taskNotifications: boolean;
  processStatusChanges: boolean;
};

const FIELDS = [
  {
    key: 'deadlineReminders' as const,
    label: 'Lembretes de prazos fatais',
    description: 'Receba alertas 3 dias, 1 dia e no dia do vencimento de prazos.',
    icon: Clock,
  },
  {
    key: 'taskNotifications' as const,
    label: 'Tarefas atribuídas',
    description: 'Seja notificado quando uma tarefa for atribuída a você.',
    icon: CheckSquare,
  },
  {
    key: 'processStatusChanges' as const,
    label: 'Atualizações de processo',
    description: 'Receba alertas quando o status de um processo for alterado.',
    icon: Activity,
  },
];

export function NotificationPreferencesForm({
  initial,
}: {
  initial: Preferences;
}) {
  const [prefs, setPrefs] = useState<Preferences>(initial);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSave() {
    startTransition(async () => {
      const { auth } = await import('@/lib/auth');
      const session = await auth();
      if (!session?.user?.id) return;

      await updateNotificationPreferences(session.user.id, prefs);
      revalidatePath('/configuracoes/notificacoes');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  const allOn = prefs.deadlineReminders && prefs.taskNotifications && prefs.processStatusChanges;

  return (
    <div className="space-y-4">
      {/* Toggle geral */}
      <div className="flex items-center justify-between rounded-md border border-ink-800 bg-ink-900/40 p-4">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-vara-400" />
          <div>
            <p className="text-sm font-medium text-ink-100">Notificações por e-mail</p>
            <p className="text-xs text-ink-400">
              {prefs.emailNotificationsEnabled
                ? 'E-mails ativos — desative para silenciar tudo'
                : 'E-mails desativados'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPrefs((p) => ({ ...p, emailNotificationsEnabled: !p.emailNotificationsEnabled }))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            prefs.emailNotificationsEnabled ? 'bg-vara-600' : 'bg-ink-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              prefs.emailNotificationsEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Sub-toggles (só se geral ativo) */}
      {prefs.emailNotificationsEnabled && (
        <div className="space-y-2 pl-2 border-l-2 border-ink-800">
          {FIELDS.map(({ key, label, description, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between rounded-md border border-ink-800 bg-ink-950 p-4">
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-ink-500" />
                <div>
                  <p className="text-sm font-medium text-ink-200">{label}</p>
                  <p className="text-xs text-ink-500">{description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, [key]: !p[key] }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  prefs[key] ? 'bg-vara-600' : 'bg-ink-700'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    prefs[key] ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {!prefs.emailNotificationsEnabled && (
        <p className="text-xs text-ink-500 pl-2">
          Desative as notificações por e-mail acima para reativar os tipos individuais.
        </p>
      )}

      {/* Botão salvar */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1 text-xs text-improcede-400">
            <Check className="h-3.5 w-3.5" />
            Salvo com sucesso
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || (allOn === prefs.emailNotificationsEnabled && allOn === prefs.deadlineReminders && allOn === prefs.taskNotifications && allOn === prefs.processStatusChanges)}
          className="flex items-center gap-2 rounded-md bg-vara-700 px-4 py-2 text-sm font-medium text-ink-50 hover:bg-vara-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="h-4 w-4" />
          {isPending ? 'Salvando...' : 'Salvar preferências'}
        </button>
      </div>
    </div>
  );
}
