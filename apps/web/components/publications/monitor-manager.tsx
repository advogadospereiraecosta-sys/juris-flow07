'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, AlertCircle, Trash2, Power } from 'lucide-react';
import {
  criarMonitorAction,
  toggleMonitorAction,
  deletarMonitorAction,
} from '@/lib/actions/monitores';

type Monitor = {
  id: string;
  kind: 'OAB' | 'CNPJ' | 'PARTY_NAME';
  value: string;
  court: string | null;
  active: boolean;
  createdAt: Date | string;
};

type Props = {
  initialMonitors: Monitor[];
  limit: number;
};

const KINDS = [
  { value: 'OAB', label: 'OAB', placeholder: 'Ex: 19347 ou 19347/RN', description: 'Vai matchear qualquer publicação que mencione essa OAB' },
  { value: 'CNPJ', label: 'CNPJ', placeholder: '00.000.000/0000-00', description: 'Vai matchear publicações com partes desse CNPJ' },
  { value: 'PARTY_NAME', label: 'Nome de parte', placeholder: 'Ex: Banco XYZ S.A.', description: 'Vai matchear publicações em que esse nome aparecer como parte' },
] as const;

export function MonitorManager({ initialMonitors, limit }: Props) {
  const router = useRouter();
  const [monitors, setMonitors] = useState<Monitor[]>(initialMonitors);
  const [kind, setKind] = useState<'OAB' | 'CNPJ' | 'PARTY_NAME'>('OAB');
  const [value, setValue] = useState('');
  const [court, setCourt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeCount = monitors.filter((m) => m.active).length;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await criarMonitorAction({
      kind,
      value: value.trim(),
      court: court.trim() || undefined,
    });

    if (!res.success || !res.monitorId) {
      setError(res.error ?? 'Erro');
      setSubmitting(false);
      return;
    }

    // Adiciona otimisticamente
    const novo: Monitor = {
      id: res.monitorId,
      kind,
      value: value.trim(),
      court: court.trim() || null,
      active: true,
      createdAt: new Date(),
    };
    setMonitors((prev) => [novo, ...prev]);
    setValue('');
    setCourt('');
    setSubmitting(false);
    router.refresh();
  }

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      await toggleMonitorAction({ id, active });
      setMonitors((prev) => prev.map((m) => (m.id === id ? { ...m, active } : m)));
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Remover este monitoramento? Publicações já capturadas continuam na inbox.')) return;
    startTransition(async () => {
      await deletarMonitorAction({ id });
      setMonitors((prev) => prev.filter((m) => m.id !== id));
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Header com contagem */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-100 flex items-center gap-2">
          Monitoramentos
        </h3>
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            activeCount >= limit
              ? 'bg-rede-950/40 text-rede-300'
              : 'bg-ink-800 text-ink-400'
          }`}
        >
          {activeCount}/{limit} {activeCount >= limit && '— limite atingido'}
        </span>
      </div>

      {/* Form para adicionar */}
      <form
        onSubmit={handleCreate}
        className="rounded-lg border border-ink-800 bg-ink-900/30 p-4 space-y-3"
      >
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-3">
            <label className="block text-xs font-medium text-ink-300 mb-1.5">Tipo</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
              className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-vara-600 focus:outline-none"
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-7">
            <label className="block text-xs font-medium text-ink-300 mb-1.5">Valor</label>
            <input
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={KINDS.find((k) => k.value === kind)?.placeholder}
              className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-ink-300 mb-1.5">Tribunal</label>
            <input
              value={court}
              onChange={(e) => setCourt(e.target.value.toUpperCase())}
              placeholder="Opcional"
              maxLength={10}
              className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none"
            />
          </div>
        </div>
        <p className="text-[10px] text-ink-500">
          {KINDS.find((k) => k.value === kind)?.description}
        </p>

        {error && (
          <div className="rounded-md border border-prazo-700/40 bg-prazo-950/20 px-3 py-2 text-xs text-prazo-300 flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || activeCount >= limit}
            className="inline-flex items-center gap-1.5 rounded-md bg-vara-700 px-4 py-2 text-sm font-medium text-ink-50 hover:bg-vara-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <Plus className="h-4 w-4" />
            Adicionar monitoramento
          </button>
        </div>
      </form>

      {/* Lista */}
      {monitors.length === 0 ? (
        <div className="rounded-md border border-dashed border-ink-700 bg-ink-900/40 py-8 text-center">
          <p className="text-sm text-ink-500">Nenhum monitoramento configurado.</p>
          <p className="text-xs text-ink-600 mt-1">
            Cadastre uma OAB, CNPJ ou nome para captar publicações automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {monitors.map((m) => (
            <div
              key={m.id}
              className={`flex items-center gap-3 rounded-md border px-3 py-2 transition-colors ${
                m.active
                  ? 'border-ink-700 bg-ink-900/40'
                  : 'border-ink-800 bg-ink-900/20 opacity-60'
              }`}
            >
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                  m.kind === 'OAB'
                    ? 'bg-blue-950/40 text-blue-300'
                    : m.kind === 'CNPJ'
                    ? 'bg-improcede-950/40 text-improcede-300'
                    : 'bg-prazo-950/40 text-prazo-300'
                }`}
              >
                {m.kind}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink-100 font-medium truncate">
                  {m.value}
                  {m.court && (
                    <span className="text-[10px] text-ink-500 ml-2">[{m.court}]</span>
                  )}
                </p>
                <p className="text-[10px] text-ink-500">
                  Criado em {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => handleToggle(m.id, !m.active)}
                className={`rounded-md p-2 ${
                  m.active ? 'text-improcede-400 hover:bg-improcede-950/30' : 'text-ink-500 hover:bg-ink-800'
                }`}
                title={m.active ? 'Desativar' : 'Ativar'}
              >
                <Power className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => handleDelete(m.id)}
                className="rounded-md p-2 text-prazo-400 hover:bg-prazo-950/30"
                title="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
