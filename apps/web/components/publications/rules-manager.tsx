'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Plus, Mail, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { toggleRuleAction } from '@/lib/actions/tenant-settings';

type Settings = {
  autoAssignToResponsible: boolean;
  notifyOnNewPublication: boolean;
  emailDigestFrequency: 'NEVER' | 'DAILY' | 'WEEKLY';
};

export function RegrasManager({ initialSettings }: { initialSettings: Settings }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    startTransition(async () => {
      await toggleRuleAction(next);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="rounded-lg border border-ink-800 bg-ink-900/30 p-4">
        <h3 className="text-sm font-semibold text-ink-100 flex items-center gap-2 mb-2">
          <Bell className="h-4 w-4 text-vara-400" />
          Automações de publicação
        </h3>
        <p className="text-xs text-ink-400">
          Quando uma publicação chega ao inbox e o sistema identifica um caso vinculado, ele pode tomar ações automáticas no Kanban.
        </p>
      </div>

      {/* Regra 1 — Distribuição automática */}
      <ToggleRow
        icon={Plus}
        title="Distribuir para o responsável do caso"
        description="Se o CNJ da publicação tem um caso vinculado, a tarefa de triagem já é atribuída ao responsável do processo (não vai pra ninguém)."
        active={settings.autoAssignToResponsible}
        onToggle={(v) => update('autoAssignToResponsible', v)}
        pending={pending}
      />

      {/* Regra 2 — Notificação */}
      <ToggleRow
        icon={Mail}
        title="Notificar por e-mail quando chegar publicação"
        description="Envia um resumo diário do inbox para o e-mail do escritório. Pode ser desligado para reduzir ruído."
        active={settings.notifyOnNewPublication}
        onToggle={(v) => update('notifyOnNewPublication', v)}
        pending={pending}
      />

      {/* Frequência do digest (só aparece se notificação ativa) */}
      {settings.notifyOnNewPublication && (
        <div className="ml-12 mt-2">
          <p className="text-xs font-medium text-ink-300 mb-1.5">Frequência do digest</p>
          <div className="flex gap-2">
            {([
              { value: 'NEVER', label: 'Nunca (só in-app)' },
              { value: 'DAILY', label: 'Diário' },
              { value: 'WEEKLY', label: 'Semanal' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update('emailDigestFrequency', opt.value)}
                className={clsx(
                  'rounded-md border px-3 py-1.5 text-xs transition-colors',
                  settings.emailDigestFrequency === opt.value
                    ? 'border-vara-600 bg-vara-950/40 text-vara-200'
                    : 'border-ink-700 bg-ink-900/40 text-ink-400 hover:text-ink-200',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  active,
  onToggle,
  pending,
}: {
  icon: typeof Bell;
  title: string;
  description: string;
  active: boolean;
  onToggle: (v: boolean) => void;
  pending: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-ink-800 bg-ink-900/30 px-4 py-3">
      <div className="flex items-center gap-3 flex-1">
        <div className="h-9 w-9 rounded-md bg-vara-950/30 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-vara-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-ink-100 font-medium">{title}</p>
          <p className="text-xs text-ink-500 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onToggle(!active)}
        disabled={pending}
        className={clsx(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
          active ? 'bg-vara-600' : 'bg-ink-700',
        )}
      >
        <span
          className={clsx(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            active ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  );
}
