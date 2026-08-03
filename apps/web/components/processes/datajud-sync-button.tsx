'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, Cloud } from 'lucide-react';
import { clsx } from 'clsx';

type Props = {
  caseId: string;
  cnj: string | null;
};

type Stage = 'idle' | 'connecting' | 'searching' | 'processing' | 'saving' | 'done' | 'error';

const STAGE_LABELS: Record<Stage, string> = {
  idle: '',
  connecting: 'Conectando aos tribunais',
  searching: 'Buscando movimentações',
  processing: 'Processando histórico',
  saving: 'Salvando no processo',
  done: 'Concluído',
  error: 'Erro',
};

export function DatajudSyncButton({ caseId, cnj }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ criados: number; atualizados: number } | null>(null);

  async function handleSync() {
    if (!cnj) {
      setError('Processo sem CNJ. Adicione o CNJ antes de sincronizar.');
      setStage('error');
      return;
    }

    setOpen(true);
    setStage('connecting');
    setError(null);
    setResult(null);

    // Anima os stages (UX didático — na prática o backend processa tudo de uma vez)
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    setStage('searching');
    await sleep(600);
    setStage('processing');
    await sleep(400);

    try {
      const res = await fetch('/api/datajud/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
      });
      const data = await res.json().catch(() => ({}));
      console.log('[datajud-sync]', { status: res.status, data });
      if (!res.ok || !data.success) {
        setStage('error');
        setError(
          data.error
            ? `${data.error}${data.detail ? ` — ${data.detail}` : ''}`
            : `Erro HTTP ${res.status} — verifique o log do servidor`,
        );
        return;
      }

      setStage('saving');
      await sleep(300);
      setStage('done');
      const result = data.data ?? {};
      setResult({
        criados: (result.criadas ?? 0) + (result.publicacoesCriadas ?? 0),
        atualizados: result.fataisNovas ?? 0,
      });
      router.refresh();
    } catch (e) {
      setStage('error');
      setError(e instanceof Error ? e.message : 'Erro de rede');
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleSync}
        disabled={stage !== 'idle' && stage !== 'done' && stage !== 'error'}
        className="inline-flex items-center gap-1.5 rounded-md border border-blue-700/40 bg-blue-950/30 px-3 py-1.5 text-xs font-medium text-blue-200 hover:bg-blue-950/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Buscar movimentações no DataJud (CNJ)"
      >
        <Cloud className="h-3.5 w-3.5" />
        Sincronizar DataJud
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-ink-950 border border-ink-700 rounded-lg shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-ink-800">
              <h3 className="text-sm font-semibold text-ink-100 flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-blue-400" />
                Sincronizando DataJud
              </h3>
              {stage === 'done' && (
                <button onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-100">
                  ✕
                </button>
              )}
            </div>

            <div className="p-5 space-y-3">
              {(['connecting', 'searching', 'processing', 'saving'] as Stage[]).map((s) => {
                const done = stage === 'done' || (STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf(s));
                const active = stage === s;
                return (
                  <div key={s} className="flex items-center gap-3">
                    <div className="shrink-0">
                      {active ? (
                        <Loader2 className="h-4 w-4 animate-spin text-vara-400" />
                      ) : done ? (
                        <CheckCircle2 className="h-4 w-4 text-improcede-400" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-ink-700" />
                      )}
                    </div>
                    <span
                      className={clsx(
                        'text-sm',
                        active ? 'text-ink-100 font-medium' : done ? 'text-ink-400' : 'text-ink-500',
                      )}
                    >
                      {STAGE_LABELS[s]}
                    </span>
                  </div>
                );
              })}

              {stage === 'done' && result && (
                <div className="mt-4 rounded-md border border-improcede-800/40 bg-improcede-950/20 px-3 py-2 text-xs text-improcede-200">
                  <p className="font-medium">
                    ✓ {result.criados} nova(s) + {result.atualizados} atualizada(s)
                  </p>
                  <p className="text-improcede-400/70 mt-0.5">
                    Movimentações adicionadas à timeline.
                  </p>
                </div>
              )}

              {stage === 'error' && (
                <div className="mt-4 rounded-md border border-prazo-700/40 bg-prazo-950/20 px-3 py-2 text-xs text-prazo-200 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Erro ao sincronizar</p>
                    <p className="text-prazo-300/80 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-ink-500 mt-3">
                Os processos recentes ou com grande volume podem levar alguns instantes. A
                disponibilidade depende dos sistemas dos tribunais.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const STAGE_ORDER: Stage[] = ['idle', 'connecting', 'searching', 'processing', 'saving', 'done'];
