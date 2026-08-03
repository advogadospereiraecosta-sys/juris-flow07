'use client';

import Link from 'next/link';
import { X, Clock, Sparkles } from 'lucide-react';
import { useState } from 'react';

type Props = { daysLeft: number };

export function TrialBanner({ daysLeft }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const isUrgent = daysLeft <= 3;

  return (
    <div
      className={`relative rounded-md border px-4 py-3 text-sm flex items-start gap-3 mb-6 ${
        isUrgent ? 'border-prazo-700 bg-prazo-950/30' : 'border-vara-700/60 bg-vara-950/30'
      }`}
    >
      {isUrgent ? (
        <Clock className="h-4 w-4 text-prazo-400 mt-0.5 shrink-0" />
      ) : (
        <Sparkles className="h-4 w-4 text-vara-400 mt-0.5 shrink-0" />
      )}
      <div className="flex-1">
        <p className={isUrgent ? 'text-prazo-200 font-medium' : 'text-vara-200 font-medium'}>
          {daysLeft === 0
            ? 'Seu trial terminou'
            : daysLeft === 1
            ? 'Último dia de trial!'
            : `${daysLeft} dias restantes de trial`}
        </p>
        <p className="text-xs text-ink-400 mt-0.5">
          Aproveite todas as funcionalidades. Quando o trial terminar, escolha um plano para continuar.
        </p>
        <div className="mt-2 flex gap-2">
          <Link
            href="/configuracoes/billing"
            className={`text-xs underline ${isUrgent ? 'text-prazo-300' : 'text-vara-300'}`}
          >
            Ver planos →
          </Link>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-ink-500 hover:text-ink-200 p-1"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}