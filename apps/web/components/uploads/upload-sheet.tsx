'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, X, CheckCircle2, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useUploads } from './upload-context';
import { clsx } from 'clsx';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function UploadSheet() {
  const { items, hasActive, cancel, remove, clearDone, modalCount } = useUploads();
  const [collapsed, setCollapsed] = useState(false);

  // Esconde quando há modal aberto para não cobrir botões do modal
  if (items.length === 0 || modalCount > 0) return null;

  const total = items.length;
  const uploading = items.filter((i) => i.status === 'uploading').length;
  const done = items.filter((i) => i.status === 'done').length;
  const errors = items.filter((i) => i.status === 'error').length;
  const cancelled = items.filter((i) => i.status === 'cancelled').length;

  return (
    <div
      className={clsx(
        'fixed bottom-0 left-0 right-0 z-[60] bg-ink-900 border-t border-ink-700 shadow-2xl',
        'transition-transform duration-200',
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-5 py-2.5 hover:bg-ink-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {hasActive ? (
            <Loader2 className="h-4 w-4 animate-spin text-vara-400" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-improcede-400" />
          )}
          <span className="text-sm font-medium text-ink-100">
            Uploads
            <span className="ml-2 text-xs text-ink-400">
              {hasActive ? `Enviando ${uploading} de ${total}…` : `${done} concluído(s)`}
              {errors > 0 && ` · ${errors} erro(s)`}
              {cancelled > 0 && ` · ${cancelled} cancelado(s)`}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!hasActive && done > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clearDone(); }}
              className="text-xs text-ink-400 hover:text-ink-100 px-2 py-1"
              title="Limpar concluídos"
            >
              <Trash2 className="h-3.5 w-3.5 inline mr-1" />
              Limpar
            </button>
          )}
          {collapsed ? <ChevronUp className="h-4 w-4 text-ink-400" /> : <ChevronDown className="h-4 w-4 text-ink-400" />}
        </div>
      </button>

      {/* Lista */}
      {!collapsed && (
        <div className="max-h-72 overflow-y-auto border-t border-ink-800">
          <ul className="divide-y divide-ink-800">
            {items.map((it) => {
              const pct = it.bytesTotal > 0 ? Math.min(100, (it.bytesSent / it.bytesTotal) * 100) : 0;
              const isDone = it.status === 'done';
              const isError = it.status === 'error';
              const isCancelled = it.status === 'cancelled';
              const isUploading = it.status === 'uploading';

              return (
                <li key={it.id} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={clsx('truncate', isDone || isCancelled ? 'text-ink-500 line-through' : 'text-ink-100')}>
                        {it.file.name}
                      </p>
                      <span className="shrink-0 text-[10px] text-ink-500">
                        {formatBytes(it.bytesSent)} / {formatBytes(it.bytesTotal)}
                        {isDone && ' · concluído'}
                        {isError && ` · erro${it.error ? `: ${it.error}` : ''}`}
                        {isCancelled && ' · cancelado'}
                      </span>
                    </div>
                    {/* Barra de progresso */}
                    <div className="mt-1 h-1.5 w-full bg-ink-800 rounded overflow-hidden">
                      <div
                        className={clsx(
                          'h-full transition-all duration-200',
                          isError && 'bg-prazo-500',
                          isDone && 'bg-improcede-500',
                          isCancelled && 'bg-ink-600',
                          isUploading && 'bg-vara-500',
                        )}
                        style={{ width: `${isCancelled ? 0 : pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isUploading ? (
                      <button
                        type="button"
                        onClick={() => cancel(it.id)}
                        className="text-xs text-ink-400 hover:text-prazo-400 px-2 py-1"
                        title="Cancelar"
                      >
                        Cancelar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => remove(it.id)}
                        className="text-ink-400 hover:text-ink-100 p-1"
                        title="Remover da lista"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}