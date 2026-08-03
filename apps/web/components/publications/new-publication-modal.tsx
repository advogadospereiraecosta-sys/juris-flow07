'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2, FileText, AlertCircle, CheckCircle2, Link2 } from 'lucide-react';

export function NewPublicationModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [days, setDays] = useState(15);
  const [publishDate, setPublishDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchInfo, setMatchInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/publicacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: text,
          source: 'MANUAL',
          publishedAt: publishDate,
          prazoDias: days,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Erro ao criar');
        setSubmitting(false);
        return;
      }

      // Mostra feedback de match por 3 segundos antes de fechar
      if (data.matched) {
        const m = data.matched;
        const vias = [
          m.viaCnpj && 'CNPJ',
          m.viaOab && 'OAB',
          m.viaPartyName && 'Nome de parte',
        ].filter(Boolean);
        const matchMsg = vias.length > 0
          ? `Vinculado automaticamente via ${vias.join(' + ')} → ${m.linkedToCase ? 'caso + tarefa criados' : 'cliente encontrado'}`
          : 'Nenhum match automático (você pode vincular manualmente na inbox).';
        setMatchInfo(matchMsg);
        await new Promise((r) => setTimeout(r, 2500));
      }

      setText('');
      setOpen(false);
      router.refresh();
    } catch {
      setError('Erro de rede');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-vara-700 px-4 py-2 text-sm font-medium text-ink-50 hover:bg-vara-600 transition-colors"
      >
        <FileText className="h-4 w-4" />
        Nova publicação
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl bg-ink-950 border border-ink-700 rounded-lg shadow-2xl flex flex-col max-h-[80vh]"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-800">
          <h3 className="text-sm font-semibold text-ink-100 flex items-center gap-2">
            <FileText className="h-4 w-4 text-vara-400" />
            Adicionar publicação manualmente
          </h3>
          <button type="button" onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-100 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          <div className="rounded-md border border-ink-800 bg-ink-900/40 px-3 py-2 text-xs text-ink-400">
            <CheckCircle2 className="h-3.5 w-3.5 inline mr-1 text-improcede-400" />
            Cole o texto da publicação abaixo. O sistema detecta automaticamente CNJ, OAB, partes e calcula o prazo fatal.
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-300 mb-1.5">
              Texto da publicação <span className="text-rede-500">*</span>
            </label>
            <textarea
              required
              minLength={20}
              rows={10}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Cole aqui o texto da publicação do DJE/DJEN…"
              className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600 font-mono resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-300 mb-1.5">
                Data da publicação
              </label>
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-300 mb-1.5">
                Prazo em dias úteis
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value || '5', 10))}
                className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
              />
              <p className="mt-1 text-[10px] text-ink-500">
                Sugestão: contestação 15, apelação 15, recurso especial 15, embargos 5.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-prazo-700/40 bg-prazo-950/20 px-3 py-2 text-xs text-prazo-300 flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-ink-800 bg-ink-900/40">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md px-4 py-2 text-sm font-medium text-ink-300 hover:text-ink-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || text.length < 20}
            className="rounded-md bg-vara-700 px-5 py-2 text-sm font-medium text-ink-50 hover:bg-vara-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitting ? 'Salvando...' : 'Cadastrar'}
          </button>
        </div>
      </form>
    </div>
  );
}
